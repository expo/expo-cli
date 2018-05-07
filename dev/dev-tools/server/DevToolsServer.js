import { graphiqlExpress } from 'apollo-server-express';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import bodyParser from 'body-parser';
import compression from 'compression';
import express from 'express';
import freeportAsync from 'freeport-async';
import * as graphql from 'graphql';
import next from 'next';

import GraphQLSchema from './graphql/GraphQLSchema';

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
      SubscriptionServer.create(
        {
          schema: GraphQLSchema,
          rootValue: {
            currentProject: {
              projectDir,
            },
          },
          execute: graphql.execute,
          subscribe: graphql.subscribe,
        },
        { server: httpServer, path: '/graphql' }
      );
      resolve(`http://localhost:${port}`);
    });
  });
}
