import { graphiqlExpress } from 'apollo-server-express';
import { Project } from '@expo/xdl';
import express from 'express';
import http from 'http';
import next from 'next';
import openBrowser from 'react-dev-utils/openBrowser';

import { startGraphQLServer, createAuthenticationContextAsync } from './DevToolsServer';

const PORT = 3333;

async function run() {
  try {
    const projectDir = process.argv[2];
    if (!projectDir) {
      throw new Error('No project dir specified.\nUsage: yarn dev <project-dir>');
    }

    const app = next({ dev: true });
    await app.prepare();

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
    server.get('*', app.getRequestHandler());

    const httpServer = http.createServer(server);
    await new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.once('listening', resolve);
      httpServer.listen(PORT, 'localhost');
    });
    startGraphQLServer(projectDir, httpServer, authenticationContext);
    console.log('Starting project...');
    await Project.startAsync(projectDir);
    let url = `http://localhost:${PORT}`;
    console.log(`Development server running at ${url}`);
    openBrowser(url);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
