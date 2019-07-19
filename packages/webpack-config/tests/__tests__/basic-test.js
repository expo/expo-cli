'use strict';

// const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { Webpack } = require('@expo/xdl');

describe('basic', () => {
  process.env.EXPO_DEBUG = true;
  //   process.env.EXPO_WEB_INFO = true;

  it('starts', async () => {
    const projectRoot = fs.realpathSync(path.resolve(__dirname, '../basic'));

    const info = await Webpack.startAsync(
      projectRoot,
      {
        nonInteractive: true,
      },
      true
    );
    console.log('WebpackDevServer listening at localhost:', info.url.split(':').pop());
    if (info.server) {
      info.server.close();
    }
  });
  it('builds', async () => {
    const projectRoot = fs.realpathSync(path.resolve(__dirname, '../basic'));
    console.log('root', projectRoot);
    await Webpack.bundleAsync(
      projectRoot,
      {
        nonInteractive: true,
      },
      true
    );
  });
});
