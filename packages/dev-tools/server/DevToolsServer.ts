import { ProjectSettings } from '@expo/dev-api';
import base64url from 'base64url';
import crypto from 'crypto';
import express from 'express';
import freeportAsync from 'freeport-async';
import * as graphql from 'graphql';
import http from 'http';
import path from 'path';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { Logger, PackagerLogsStream, ProjectUtils } from 'xdl';
// @ts-ignore

import AsyncIterableRingBuffer from './graphql/AsyncIterableRingBuffer';
import GraphQLSchema from './graphql/GraphQLSchema';
import Issues, { Issue } from './graphql/Issues';
import createContext, { PROCESS_SOURCE } from './graphql/createContext';

const serverStartTimeUTCString = new Date().toUTCString();

function setHeaders(res: express.Response): void {
  // Set the Last-Modified header to server start time because otherwise it
  // becomes Sat, 26 Oct 1985 08:15:00 GMT for files installed from npm.
  res.setHeader('Last-Modified', serverStartTimeUTCString);
}

async function generateSecureRandomTokenAsync(): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (error, buffer) => {
      if (error) reject(error);
      else resolve(base64url.fromBase64(buffer.toString('base64')));
    });
  });
}

export async function createAuthenticationContextAsync({ port }: { port: number }) {
  const clientAuthenticationToken = await generateSecureRandomTokenAsync();
  const endpointUrlToken = await generateSecureRandomTokenAsync();
  const graphQLEndpointPath = `/${endpointUrlToken}/graphql`;
  const hostname = `${devtoolsGraphQLHost()}:${port}`;
  const webSocketGraphQLUrl = `ws://${hostname}${graphQLEndpointPath}`;
  const allowedOrigin = `http://${hostname}`;
  return {
    clientAuthenticationToken,
    graphQLEndpointPath,
    webSocketGraphQLUrl,
    allowedOrigin,
    requestHandler: (request: express.Request, response: express.Response): void => {
      response.json({ webSocketGraphQLUrl, clientAuthenticationToken });
    },
  };
}

export async function startAsync(projectRoot: string): Promise<string> {
  const port = await freeportAsync(19002, { hostnames: [null, 'localhost'] });
  const server = express();

  const authenticationContext = await createAuthenticationContextAsync({ port });
  server.get('/dev-tools-info', authenticationContext.requestHandler);
  server.use(
    '/_next',
    express.static(path.join(__dirname, '../client/_next'), {
      // All paths in the _next folder include hashes, so they can be cached more aggressively.
      immutable: true,
      maxAge: '1y',
      setHeaders,
    })
  );
  server.use(express.static(path.join(__dirname, '../client'), { setHeaders }));

  const listenHostname = devtoolsHost();
  const httpServer = http.createServer(server);
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.once('listening', resolve);
    httpServer.listen(port, listenHostname);
  });
  startGraphQLServer(projectRoot, httpServer, authenticationContext);
  await ProjectSettings.setPackagerInfoAsync(projectRoot, { devToolsPort: port });
  return `http://${listenHostname}:${port}`;
}

export function startGraphQLServer(
  projectRoot: string,
  httpServer: http.Server,
  authenticationContext: any
) {
  const layout = createLayout();
  const issues = new Issues();
  const messageBuffer = createMessageBuffer(projectRoot, issues);
  SubscriptionServer.create(
    {
      schema: GraphQLSchema,
      execute: graphql.execute,
      subscribe: graphql.subscribe,
      onOperation: (operation, params) => ({
        ...params,
        context: createContext({
          projectDir: projectRoot,
          messageBuffer,
          layout,
          issues,
        }),
      }),
      onConnect: connectionParams => {
        if (
          !connectionParams.clientAuthenticationToken ||
          connectionParams.clientAuthenticationToken !==
            authenticationContext.clientAuthenticationToken
        ) {
          throw new Error('Dev Tools API authentication failed.');
        }
        return true;
      },
    },
    {
      server: httpServer,
      path: authenticationContext.graphQLEndpointPath,
      verifyClient: info => {
        return info.origin === authenticationContext.allowedOrigin;
      },
    }
  );
}

function devtoolsHost(): string {
  if (process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS) {
    return process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS.trim();
  }
  return 'localhost';
}

function devtoolsGraphQLHost(): string {
  if (process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS && process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
    return process.env.REACT_NATIVE_PACKAGER_HOSTNAME.trim();
  } else if (process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS) {
    return process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS;
  }
  return 'localhost';
}

function createLayout() {
  let layout = {
    selected: null,
    sources: null,
    sourceLastReads: {},
  };
  return {
    get(): any {
      return layout;
    },
    set(newLayout: any): void {
      layout = {
        ...layout,
        ...newLayout,
      };
    },
    setLastRead(sourceId: string, lastReadCursor: any): void {
      layout.sourceLastReads[sourceId] = lastReadCursor;
    },
  };
}

function createMessageBuffer(projectRoot: string, issues: Issue): AsyncIterableRingBuffer {
  const buffer = new AsyncIterableRingBuffer(10000);

  // eslint-disable-next-line no-new
  new PackagerLogsStream({
    projectRoot,
    updateLogs(updater) {
      const chunks = updater([]);
      chunks.forEach(chunk => {
        if (chunk.issueId) {
          if (chunk.issueCleared) {
            issues.clearIssue(chunk.issueId);
          } else {
            issues.addIssue(chunk.issueId, chunk);
          }
          return;
        }
        buffer.push({
          type: 'ADDED',
          sourceId: PROCESS_SOURCE.id,
          node: chunk,
        });
      });
    },
    onStartBuildBundle({ chunk }) {
      buffer.push({
        type: 'ADDED',
        sourceId: PROCESS_SOURCE.id,
        node: {
          ...chunk,
          progress: 0,
          duration: 0,
        },
      });
    },
    onProgressBuildBundle({ progress, start, chunk }) {
      buffer.push({
        type: 'UPDATED',
        sourceId: PROCESS_SOURCE.id,
        node: {
          ...chunk,
          progress,
          // @ts-ignore
          duration: new Date() - (start || new Date()),
        },
      });
    },
    onFinishBuildBundle({ error, start, end, chunk }) {
      buffer.push({
        type: 'UPDATED',
        sourceId: PROCESS_SOURCE.id,
        node: {
          ...chunk,
          error,
          // @ts-ignore
          duration: end - (start || new Date()),
        },
      });
    },
  });

  // needed for validation logging to function
  ProjectUtils.attachLoggerStream(projectRoot, {
    stream: {
      write: chunk => {
        if (chunk.tag === 'device') {
          buffer.push({
            type: 'ADDED',
            sourceId: chunk.deviceId,
            node: chunk,
          });
        }
      },
    },
    type: 'raw',
  });

  Logger.global.addStream({
    stream: {
      write: chunk => {
        buffer.push({
          type: 'ADDED',
          sourceId: PROCESS_SOURCE.id,
          node: chunk,
        });
      },
    },
    type: 'raw',
  });

  return buffer;
}
