/**
 * @flow
 */

jest.mock('analytics-node');
jest.mock('fs');
jest.mock('../Env');
jest.mock('request');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

describe('loginAsync', () => {
  xit('calls login Api and stores the username', async () => {
    const fs = require('fs');
    const request = require('request');
    const UserManager = require('../User');

    request.__setMockResponse({
      body: {
        err: null,
        user: {
          type: 'client',
          username: 'jesse',
        },
      },
    });

    await UserManager.loginAsync({
      username: 'jesse',
      password: 'kicho0',
    });

    // Make sure Api request is correct
    expect(request.mock.calls[0][0].url).toEqual('https://exp.host/--/api/adduser/%7B%22username%22%3A%22jesse%22%2C%22type%22%3A%22client%22%2C%22hashedPassword%22%3A%22eddd4a018e0b4d02230d991284620fd7%22%7D');

    // Make sure the correct information was written to disk
    let configFile = JSON.parse(fs.__getMockFilesystem()['home']['.exponent']['exponent.json']);
    expect(configFile.accessToken).toBeDefined();
    expect(configFile.type).toEqual('client');
    expect(configFile.username).toEqual('jesse');
  });
});

describe('logoutAsync', () => {
  xit('calls logout Api and cleans the username', async () => {
    const fs = require('fs');
    const request = require('request');
    const UserManager = require('../User');

    request.__setMockResponse({
      body: {
        err: null,
      },
    });

    fs.__addLoggedInUser();

    await UserManager.logoutAsync();

    expect(request.mock.calls[0][0].url).toEqual('https://exp.host/--/api/logout/%5B%5D');

    let configFile = JSON.parse(fs.__getMockFilesystem()['home']['.exponent']['exponent.json']);
    expect(configFile.username).toBeUndefined();
  });
});
