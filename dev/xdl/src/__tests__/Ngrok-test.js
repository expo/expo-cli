/**
 * Tests setting up an ngrok tunnel
 *
 */
'use strict';

jest.disableAutomock();
jest.useRealTimers();
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

import request from 'request';

import xdl from '../../';

describe('ngrok', () => {
  it('starts running and serves manifest', async () => {
    let PackagerController = xdl.PackagerController;
    let pc = PackagerController.testInstance();
    let result = await pc.startAsync();
    let ngrokUrl = await pc.getNgrokUrlAsync();
    if (!ngrokUrl) {
      throw new Error("ngrok didn't return a URL");
    }
    let httpNgrokUrl = ngrokUrl.replace(/^https/, 'http');
    let response = await request.promise.get(httpNgrokUrl);
    if (!response.body) {
      throw new Error("Didn't get expected response");
    }
    let responseValue = JSON.parse(response.body);
    if (responseValue.error || response.statusCode !== 200) {
      throw new Error("Server responded with an error: " + responseValue.error);
    }
    console.log("Successfully fetched manifest through ngrok and everything seems OK");
    await pc.stopAsync();
  });
});
