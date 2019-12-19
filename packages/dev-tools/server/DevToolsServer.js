import { Logger, PackagerLogsStream, ProjectSettings, ProjectUtils } from '@expo/xdl';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import * as graphql from 'graphql';
import express from 'express';
import freeportAsync from 'freeport-async';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import base64url from 'base64url';

import AsyncIterableRingBuffer from './graphql/AsyncIterableRingBuffer';
import GraphQLSchema from './graphql/GraphQLSchema';
import createContext, { PROCESS_SOURCE } from './graphql/createContext';
import Issues from './graphql/Issues';

const serverStartTimeUTCString = new Date().toUTCString();

function setHeaders(res) {
  // Set the Last-Modified header to server start time because otherwise it
  // becomes Sat, 26 Oct 1985 08:15:00 GMT for files installed from npm.
  res.setHeader('Last-Modified', serverStartTimeUTCString);
}

async function generateSecureRandomTokenAsync() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (error, buffer) => {
      if (error) reject(error);
      else resolve(base64url.fromBase64(buffer.toString('base64')));
    });
  });
}

export async function createAuthenticationContextAsync({ graphqlHostname, port }) {
  const clientAuthenticationToken = await generateSecureRandomTokenAsync();
  const endpointUrlToken = await generateSecureRandomTokenAsync();
  const graphQLEndpointPath = `/${endpointUrlToken}/graphql`;
  const hostname = `${graphqlHostname}:${port}`;
  const webSocketGraphQLUrl = `ws://${hostname}${graphQLEndpointPath}`;
  const allowedOrigin = `http://${hostname}`;
  return {
    clientAuthenticationToken,
    graphQLEndpointPath,
    webSocketGraphQLUrl,
    allowedOrigin,
    requestHandler: (request, response) => {
      response.json({ webSocketGraphQLUrl, clientAuthenticationToken });
    },
  };
}

export async function startAsync(projectDir) {
  const port = await freeportAsync(19002, { hostnames: [null, 'localhost'] });
  const server = express();
  const listenHostname = devtoolsHost();
  const graphqlHostname = devtoolsGraphQLHost();

  const authenticationContext = await createAuthenticationContextAsync({ graphqlHostname, port });
  const { webSocketGraphQLUrl, clientAuthenticationToken } = authenticationContext;
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

  const httpServer = http.createServer(server);
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.once('listening', resolve);
    httpServer.listen(port, listenHostname);
  });
  startGraphQLServer(projectDir, httpServer, authenticationContext);
  await ProjectSettings.setPackagerInfoAsync(projectDir, { devToolsPort: port });
  return `http://${listenHostname}:${port}`;
}

export function startGraphQLServer(projectDir, httpServer, authenticationContext) {
  const layout = createLayout();
  const issues = new Issues();
  const messageBuffer = createMessageBuffer(projectDir, issues);
  SubscriptionServer.create(
    {
      schema: GraphQLSchema,
      execute: graphql.execute,
      subscribe: graphql.subscribe,
      onOperation: (operation, params) => ({
        ...params,
        context: createContext({
          projectDir,
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

function devtoolsHost() {
  let devtoolHost;
  if (process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS) {
    devtoolHost = process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS.trim();
  } else {
    devtoolHost = `localhost`;
  }
  return devtoolHost;
}

function devtoolsGraphQLHost() {
  let devtoolsGraphQLHost;
  if (process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS && process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
    devtoolsGraphQLHost = process.env.REACT_NATIVE_PACKAGER_HOSTNAME.trim();
  } else if (process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS) {
    devtoolsGraphQLHost = process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS;
  } else {
    devtoolsGraphQLHost = `localhost`;
  }
  return devtoolsGraphQLHost;
}

function createLayout() {
  let layout = {
    selected: null,
    sources: null,
    sourceLastReads: {},
  };
  return {
    get() {
      return layout;
    },
    set(newLayout) {
      layout = {
        ...layout,
        ...newLayout,
      };
    },
    setLastRead(sourceId, lastReadCursor) {
      layout.sourceLastReads[sourceId] = lastReadCursor;
    },
  };
}

function createMessageBuffer(projectRoot, issues) {
  const buffer = new AsyncIterableRingBuffer(10000);

  // eslint-disable-next-line no-new
  new PackagerLogsStream({
    projectRoot,
    updateLogs: updater => {
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
    onStartBuildBundle: chunk => {
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
    onProgressBuildBundle: (percentage, start, chunk) => {
      buffer.push({
        type: 'UPDATED',
        sourceId: PROCESS_SOURCE.id,
        node: {
          ...chunk,
          progress: percentage,
          duration: new Date() - (start || new Date()),
        },
      });
    },
    onFinishBuildBundle: (error, start, end, chunk) => {
      buffer.push({
        type: 'UPDATED',
        sourceId: PROCESS_SOURCE.id,
        node: {
          ...chunk,
          error,
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
