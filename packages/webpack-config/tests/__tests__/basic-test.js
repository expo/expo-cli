'use strict';

// const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { Webpack } = require('@expo/xdl');

describe('basic', () => {
  let timeout;
  beforeAll(() => {
    timeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 4;
  });
  afterAll(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = timeout;
  });
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
    await Webpack.bundleAsync(
      projectRoot,
      {
        nonInteractive: true,
      },
      true
    );
  });
});
