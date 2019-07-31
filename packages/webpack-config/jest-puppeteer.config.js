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
    url: 'https://localhost:19006',
    launch,
    server: {
      command: `../expo-cli/bin/expo.js start tests/basic/ --web-only --non-interactive --https`,
      port: 19006,
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
}[process.env.EXPO_E2E_COMMAND];

module.exports = config;
