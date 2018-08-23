import { graphiqlExpress } from 'apollo-server-express';
import { Project } from 'xdl';
import express from 'express';
import http from 'http';
import next from 'next';
import opn from 'opn';

import { startGraphQLServer } from './DevToolsServer';

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
    server.get('/graphiql', graphiqlExpress({ endpointURL: `ws://localhost:${PORT}/graphql` }));
    server.get('*', app.getRequestHandler());

    const httpServer = http.createServer(server);
    await new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.once('listening', resolve);
      httpServer.listen(PORT);
    });
    startGraphQLServer(projectDir, httpServer);
    console.log('Starting project...');
    await Project.startAsync(projectDir);
    let url = `http://localhost:${PORT}`;
    console.log(`Development server running at ${url}`);
    opn(url);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
