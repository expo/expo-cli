/**
 * @flow
 */
jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
import fs from 'fs-extra';
import path from 'path';
import HashIds from 'hashids';
import uuid from 'uuid';
import os from 'os';
import ApiV2Client from '../ApiV2';
import { stopAsync } from '../Project';
import { UserManagerInstance } from '../User';
import UserSettings from '../UserSettings';
import { clearXDLCacheAsync, downloadTemplateApp } from '../Exp';

const XDL_TEST_CLIENT_ID = 'o0YygTgKhOTdoWj10Yl9nY2P0SMTw38Y';

const _makeShortId = (salt: string, minLength: number = 10): string => {
  const hashIds = new HashIds(salt, minLength);
  return hashIds.encode(Date.now());
};

describe('api', () => {
  let userForTest;
  let projectRoot;

  beforeAll(async () => {
    process.env.__UNSAFE_EXPO_HOME_DIRECTORY = path.join(
      '/',
      'tmp',
      `.expo-${_makeShortId(uuid.v1())}`
    );

    const UserManager = _newTestUserManager();

    const username = `xdl-test-${_makeShortId(uuid.v1())}`;
    const password = uuid.v1();

    // Register a new user that we can use for this test run
    const newUser = await UserManager.registerAsync({
      username,
      password,
      email: `adam+${username}@getexponent.com`,
      givenName: 'XDL',
      familyName: 'Test User',
    });

    userForTest = newUser;
  });

  afterAll(async () => {
    if (projectRoot) {
      await stopAsync(projectRoot);
    }
    const UserManager = _newTestUserManager();
    if (process.env.__UNSAFE_EXPO_HOME_DIRECTORY) {
      fs.removeSync(process.env.__UNSAFE_EXPO_HOME_DIRECTORY);
    }
    //fs.removeSync(projectRoot);
    const api = ApiV2Client.clientForUser(userForTest);
    try {
      await api.postAsync('auth/deleteUser');
    } catch (e) {
      console.error(e);
    }
    await UserManager.logoutAsync();
  });

  it('should download the starter app template', async () => {
    await clearXDLCacheAsync();
    // Get the default directory to then download the template
    let dir = await UserSettings.getAsync('defaultNewProjectDir', os.homedir());
    let { starterAppPath } = await downloadTemplateApp('tabs', dir, {
      name: `test-template-${new Date().valueOf()}`,
      progressFunction: () => {},
      retryFunction: () => {},
    });
    // $FlowFixMe: missing definition for expect.any
    expect(starterAppPath).toEqual(expect.any(String));
    let stats = await fs.stat(starterAppPath);
    expect(stats.isFile());
  });
});

function _newTestUserManager() {
  const UserManager = new UserManagerInstance();
  UserManager.initialize();
  return UserManager;
}
