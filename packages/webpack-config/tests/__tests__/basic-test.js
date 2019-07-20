'use strict';

// const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { Webpack } = require('@expo/xdl');
const projectRoot = fs.realpathSync(path.resolve(__dirname, '../basic'));

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
    process.env.TESTING_REMOVE_UNUSED_IMPORT_EXPORTS = false;

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

  async function buildAsync() {
    await Webpack.bundleAsync(
      projectRoot,
      {
        nonInteractive: true,
      },
      true
    );
  }

  it('builds', async () => {
    process.env.TESTING_REMOVE_UNUSED_IMPORT_EXPORTS = false;
    await buildAsync();
  });

  it('builds with tree-shaking', async () => {
    process.env.TESTING_REMOVE_UNUSED_IMPORT_EXPORTS = true;
    await buildAsync();
  });
});
