import path from 'path';
import XDL from 'xdl';
import opn from 'opn';

import { DevToolsServer } from '../';

async function run() {
  try {
    let projectDir = process.argv[2];

    console.log('Using project at', projectDir);
    await XDL.Project.startAsync(projectDir);

    console.log('Starting DevToolsServer...');
    let devToolsUrl = await DevToolsServer.startAsync(projectDir);
    console.log('DevTools running at', devToolsUrl);
    opn(devToolsUrl);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
