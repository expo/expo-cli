/**
 * Tests setting up an ngrok tunnel
 *
 */
'use strict';

jest.useRealTimers();
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

const request = require('request-promise-native').defaults({
  resolveWithFullResponse: true,
});
const path = require('path');

const xdl = require('../xdl');

describe('ngrok', () => {
  xit('starts running and serves manifest', async () => {
    let projectRoot = path.resolve(__dirname, '../../../../apps/new-project-template');
    await xdl.Project.startAsync(projectRoot);
    let ngrokUrl = await xdl.Project.getUrlAsync(projectRoot, {
      urlType: 'http',
      hostType: 'tunnel',
    });
    if (!ngrokUrl) {
      throw new Error("ngrok didn't return a URL");
    }
    let response = await request.get(ngrokUrl);
    if (!response.body) {
      throw new Error("Didn't get expected manifest response");
    }
    let responseValue = JSON.parse(response.body);
    if (responseValue.error || response.statusCode !== 200) {
      throw new Error('Server responded with an error: ' + responseValue.error);
    }

    console.log('Successfully fetched manifest through ngrok and everything seems OK');

    let bundleUrl = responseValue.bundleUrl;
    console.log(`Fetching bundle at ${bundleUrl}`);
    let bundleResponse = await request.get(bundleUrl);
    if (!bundleResponse.body || !bundleResponse.body.includes('sourceMappingURL')) {
      throw new Error("Didn't get expected bundle response");
    }

    if (bundleResponse.statusCode !== 200) {
      throw new Error('Packager responded with bad status code: ' + bundleResponse.statusCode);
    }

    await xdl.Project.stopAsync(projectRoot);
  });
});
