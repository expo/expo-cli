/**
 * Tests setting up an ngrok tunnel
 *
 */
'use strict'

import promisePrint from 'promise-print';
import request from 'request';

import xdl from '../../';

async function testNgrokAsync() {
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
}


module.exports = {
  testNgrokAsync,
};

if (require.main === module) {
  promisePrint(testNgrokAsync()).then(() => {
    process.exit(0);
  }, (err) => {
    process.exit(-1)
  });
}
