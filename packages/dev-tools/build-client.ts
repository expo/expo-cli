import { Webpack } from '@expo/xdl';

import path from 'path';
import fs from 'fs';
import { chdir } from 'process';

async function run(): Promise<void> {
  try {
    const devToolsClientSourcePath = path.resolve(__dirname, './client');
    const devToolsClientBuildPath = path.resolve(__dirname, './client/web-build');
    const devToolsClientDistPath = path.resolve(__dirname, './build/client');

    chdir(devToolsClientSourcePath);
    await Webpack.bundleAsync(devToolsClientSourcePath, {
      clear: true,
      dev: false,
      pwa: false,
      nonInteractive: true,
    });

    console.log('\n', 'Moving build files from ./client/web-build to ./build/client');

    try {
      fs.statSync(devToolsClientDistPath);
      fs.rmdirSync(devToolsClientDistPath, { recursive: true });
    } catch (e) {
      // if statSync throws, that means that the directory doesn't exist and rmdirSync won't get run as well.
    }

    fs.renameSync(devToolsClientBuildPath, devToolsClientDistPath);

    console.log('\n', 'Build completed successfully!', '\n');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
