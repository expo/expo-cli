import { Logger, PackagerLogsStream, ProjectUtils } from 'xdl';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import * as graphql from 'graphql';
import bodyParser from 'body-parser';
import express from 'express';
import freeportAsync from 'freeport-async';
import path from 'path';
import http from 'http';

import AsyncIterableRingBuffer from './graphql/AsyncIterableRingBuffer';
import GraphQLSchema from './graphql/GraphQLSchema';
import createContext from './graphql/createContext';
import Issues from './graphql/Issues';

export async function startAsync(projectDir) {
  const port = await freeportAsync(19002);
  const server = express();
  server.get('*', express.static(path.join(__dirname, '../client')));

  const httpServer = http.createServer(server);
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.once('listening', resolve);
    httpServer.listen(port);
  });
  startGraphQLServer(projectDir, httpServer);
  return `http://localhost:${port}`;
}

export function startGraphQLServer(projectDir, httpServer) {
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
    },
    { server: httpServer, path: '/graphql' }
  );
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

  const packagerLogsStream = new PackagerLogsStream({
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
          node: chunk,
        });
      });
    },
    onStartBuildBundle: chunk => {
      buffer.push({
        type: 'ADDED',
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
          node: chunk,
        });
      },
    },
    type: 'raw',
  });

  return buffer;
}
