import { graphiqlExpress } from 'apollo-server-express';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import bodyParser from 'body-parser';
import compression from 'compression';
import express from 'express';
import freeportAsync from 'freeport-async';
import * as graphql from 'graphql';
import next from 'next';
import { PackagerLogsStream, ProjectUtils } from 'xdl';

import AsyncIterableRingBuffer from './graphql/AsyncIterableRingBuffer';
import GraphQLSchema from './graphql/GraphQLSchema';
import createContext from './graphql/createContext';

const dev = process.env.EXPO_DEV_TOOLS_DEBUG === '1';

export async function startAsync(projectDir) {
  const port = await freeportAsync(19002);

  const app = next({
    dev,
    quiet: !dev,
    conf: {
      publicRuntimeConfig: {
        graphqlWebSocketURL: `ws://localhost:${port}/graphql`,
      },
    },
  });
  await app.prepare();

  const server = express();
  server.use('/static', express.static('static'));
  if (!dev) {
    server.use(compression());
  }
  server.get('/graphiql', graphiqlExpress({ endpointURL: `ws://localhost:${port}/graphql` }));
  server.get('*', app.getRequestHandler());

  return new Promise((resolve, reject) => {
    let httpServer = server.listen(port, err => {
      if (err) {
        reject(err);
        return;
      }

      const layout = createLayout();
      const messageBuffer = createMessageBuffer(projectDir);

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
            }),
          }),
        },
        { server: httpServer, path: '/graphql' }
      );
      resolve(`http://localhost:${port}`);
    });
  });
}

function createLayout() {
  let layout = {
    selected: null,
    sources: null,
  };
  return {
    get() {
      return layout;
    },
    set(newLayout) {
      layout = newLayout;
    },
  };
}

function createMessageBuffer(projectRoot) {
  const buffer = new AsyncIterableRingBuffer(10000);

  const packagerLogsStream = new PackagerLogsStream({
    projectRoot,
    updateLogs: updater => {
      const chunks = updater([]);
      chunks.forEach(chunk => {
        chunk.id = chunk._id;
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
          id: chunk._id,
          _bundleEventType: 'PROGRESS',
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
          id: chunk._id,
          _bundleEventType: 'PROGRESS',
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
          id: chunk._id,
          error,
          _bundleEventType: error ? 'FAILED' : 'FINISHED',
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
          chunk.id = chunk._id;
          buffer.push({
            type: 'ADDED',
            node: chunk,
          });
        }
      },
    },
    type: 'raw',
  });

  return buffer;
}
