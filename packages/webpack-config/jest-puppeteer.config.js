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
      command: `../expo-cli/bin/expo.js start tests/basic/ --web-only --non-interactive --https`,
      port: 5000,
      launchTimeout: 30000,
      debug: true,
    },
  },
  build: {
    url: 'http://localhost:5000',
    launch,
    server: {
      command: `node jest/build-project.js tests/basic/ && serve tests/basic/web-build`,
      // The default serve-cli port
      port: 5000,
      launchTimeout: 30000,
      debug: true,
    },
  },
  startNextJs: {
    url: 'http://localhost:8000',
    launch,
    server: {
      command: `../expo-cli/bin/expo.js start tests/nextjs/ --web-only --dev --non-interactive --no-https`,
      port: 8000,
      launchTimeout: 30000,
      debug: true,
    },
    hasServerSideRendering: true,
  },
  buildNextJs: {
    url: 'http://localhost:8000',
    launch,
    server: {
      command: `../expo-cli/bin/expo.js start tests/nextjs/ --web-only --no-dev --non-interactive --no-https`,
      port: 8000,
      launchTimeout: 30000,
      debug: true,
    },
    hasServerSideRendering: true,
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
