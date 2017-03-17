/**
 * @flow
 */
jasmine.DEFAULT_TIMEOUT_INTERVAL = 240000;
import 'instapromise';
import fs from 'fs-extra';
import path from 'path';
import uuid from 'uuid';
import os from 'os';
import ApiV2Client from '../ApiV2';
import { publishAsync, startAsync, stopAsync } from '../Project';
import { UserManagerInstance } from '../User';
import UserSettings from '../UserSettings';
import {
  clearXDLCacheAsync,
  downloadTemplateApp,
  extractTemplateApp,
} from '../Exp';

const XDL_TEST_CLIENT_ID = 'o0YygTgKhOTdoWj10Yl9nY2P0SMTw38Y';

import type { User } from '../User';

describe('AxiosApiCalls', () => {
  let userForTest;
  let userForTestPassword;
  let dirName;

  beforeAll(async () => {
    process.env.__UNSAFE_EXPO_HOME_DIRECTORY = path.join(
      '/',
      'tmp',
      `.expo-${uuid.v1()}`
    );

    const UserManager = _newTestUserManager();

    const username = `xdl-test-${uuid.v1()}`;
    const password = uuid.v1();
    // Register a new user that we can use for this test run
    const newUser = await UserManager.registerAsync({
      username,
      password,
      email: `adam+${username}@getexponent.com`,
      givenName: 'XDL',
      familyName: 'Test Axios API calls',
    });
    userForTest = newUser;
  });

  afterAll(async () => {
    const UserManager = _newTestUserManager();
    if (process.env.__UNSAFE_EXPO_HOME_DIRECTORY) {
      fs.removeSync(process.env.__UNSAFE_EXPO_HOME_DIRECTORY);
    }
    fs.removeSync(dirName);
    const api = ApiV2Client.clientForUser(userForTest);
    try {
      await api.postAsync('auth/deleteUser');
    } catch (e) {
      console.error(e);
    }
    await UserManager.logoutAsync();
  });

  it('should download the starter app template, extract it and then publish it', async () => {
    await clearXDLCacheAsync();
    // Get the default directory to then download the template
    let dir = await UserSettings.getAsync('defaultNewProjectDir', os.homedir());
    let templateDownload = await downloadTemplateApp('tabs', dir, {
      name: `test-template-${new Date().valueOf()}`,
      progressFunction: () => {},
      retryFunction: () => {},
    });
    dirName = dir + '/' + templateDownload.name;
    expect(templateDownload).not.toBeNull();
    // Extract the template we just downloaded
    let projectRoot = await extractTemplateApp(
      templateDownload.starterAppPath,
      templateDownload.name,
      templateDownload.root
    );
    await startAsync(dirName, {}, false);
    // Publishes the experience
    let result = await publishAsync(dirName);
    expect(result.url).not.toBeNull();
    await stopAsync(dirName);
  });
});

function _newTestUserManager() {
  const UserManager = new UserManagerInstance();
  UserManager.initialize(XDL_TEST_CLIENT_ID); // XDL Test Client
  return UserManager;
}
