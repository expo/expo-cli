import { graphiqlExpress } from 'apollo-server-express';
import { Project, Web, Webpack } from '@expo/xdl';
import express from 'express';
import http from 'http';
import path from 'path';
import { chdir } from 'process';

import { createAuthenticationContextAsync, startGraphQLServer } from './DevToolsServer';

const PORT = 3333;

async function run(): Promise<void> {
  try {
    const projectDir = process.argv[2];
    if (!projectDir) {
      throw new Error('No project dir specified.\nUsage: yarn dev <project-dir>');
    }

    const absoluteProjectDir = path.resolve(process.cwd(), projectDir);

    const server = express();
    const authenticationContext = await createAuthenticationContextAsync({ port: PORT });
    server.get('/dev-tools-info', authenticationContext.requestHandler);
    server.get(
      '/graphiql',
      graphiqlExpress({
        endpointURL: authenticationContext.webSocketGraphQLUrl,
        websocketConnectionParams: {
          clientAuthenticationToken: authenticationContext.clientAuthenticationToken,
        },
      })
    );

    const httpServer = http.createServer(server);
    await new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.once('listening', resolve);
      httpServer.listen(PORT, 'localhost');
    });

    startGraphQLServer(absoluteProjectDir, httpServer, authenticationContext);
    console.log('Starting project...');
    await Project.startAsync(absoluteProjectDir);
    let url = `http://localhost:${PORT}`;
    console.log(`GraphQL server running at ${url}`);

    const devToolsClientPath = path.resolve(process.cwd(), './client');

    chdir(devToolsClientPath);

    await Webpack.startAsync(devToolsClientPath, { port: 19002 });
    await Web.openProjectAsync(devToolsClientPath);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
