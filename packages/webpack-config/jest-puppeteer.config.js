const assert = require('assert');
const getenv = require('getenv');
const fs = require('fs');
const path = require('path');

const launch = getenv.boolish('CI', false)
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

const PORT = 5000;

let shouldBuildProject = true;

if (
  // Only skip the build if the EXPO_E2E_SKIP_BUILD is defined and the build already exists
  getenv.boolish('EXPO_E2E_SKIP_BUILD', false) &&
  fs.existsSync(path.resolve(__dirname, 'tests/basic/web-build/index.html'))
) {
  shouldBuildProject = false;
}

const config = {
  start: {
    url: `https://localhost:${PORT}`,
    launch,
    server: {
      command: `../expo-cli/bin/expo.js start tests/basic/ --web-only --non-interactive --https`,
      port: PORT,
      launchTimeout: 30000,
      debug: true,
    },
  },
  build: {
    url: `http://localhost:${PORT}`,
    launch,
    server: {
      command: [
        shouldBuildProject && `node jest/build-project.js tests/basic/`,
        `serve tests/basic/web-build`,
      ]
        .filter(Boolean)
        .join(' && '),
      // The default serve-cli port
      port: PORT,
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
