/* eslint-env node */
const assert = require('assert');

const launch = process.env.CI
  ? {
      args: ['--ignore-certificate-errors', '--no-sandbox', '--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true,
      headless: true,
    }
  : {
      args: ['--ignore-certificate-errors'],
      ignoreHTTPSErrors: true,
      headless: true,
    };

const config = {
  start: {
    url: 'https://localhost:5000',
    launch,
    server: {
      command: `../expo-cli/bin/expo.js start e2e/basic/ --web-only --non-interactive --https`,
      port: 5000,
      launchTimeout: 30000,
      debug: true,
    },
  },
  build: {
    url: 'http://localhost:5000',
    launch,
    server: {
      command: process.env.EXPO_E2E_SKIP_BUILD
        ? `serve e2e/basic/web-build`
        : `node jest/build-project.js e2e/basic/ && serve e2e/basic/web-build`,
      // The default serve-cli port
      port: 5000,
      launchTimeout: 30000,
      debug: true,
    },
  },
}[process.env.EXPO_E2E_COMMAND];

assert(process.env.EXPO_E2E_COMMAND, `EXPO_E2E_COMMAND must be defined`);
assert(
  config,
  `"${process.env.EXPO_E2E_COMMAND}" is not a valid E2E test. Expected one of ${Object.keys(
    config
  ).join(', ')}`
);
// Tell Expo CLI to use the same port on which the test runner expects there to be a server
process.env.WEB_PORT = config.server.port;

module.exports = config;
