import fs from 'fs-extra';
import HashIds from 'hashids';
import path from 'path';
import uuid from 'uuid';

import { ApiV2 as ApiV2Client, User, UserManagerInstance } from '../';

const _makeShortId = (salt: string, minLength = 10) => {
  const hashIds = new HashIds(salt, minLength);
  return hashIds.encode(Date.now());
};

// Note: these tests are actually calling the API,
// in the unit test "User-test.ts" the API is mocked and the same tests are executed.
describe.skip('UserManager', () => {
  let userForTest: User;
  let userForTestPassword: string;

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
    userForTestPassword = password; // save password so we can use it to login

    await UserManager.logoutAsync(); // log us out so we're in a clean state for these tests
  });

  afterAll(async () => {
    if (process.env.__UNSAFE_EXPO_HOME_DIRECTORY) {
      fs.removeSync(process.env.__UNSAFE_EXPO_HOME_DIRECTORY);
    }

    const api = ApiV2Client.clientForUser(userForTest);
    try {
      await api.postAsync('auth/deleteUser');
    } catch (e) {
      console.error(e);
    }
  });

  it('should make available a global, shared UserManager singleton', () => {
    const { default: UserManager } = require('../User');
    expect(UserManager).toBeDefined();
    expect(UserManager.initialize).toBeDefined();
  });

  it('should not have a currently logged in user', async () => {
    const UserManager = _newTestUserManager();
    try {
      await UserManager.ensureLoggedInAsync();
    } catch (e) {
      expect(e.message).toEqual('Not logged in');
    }
  });

  it('should login successfully', async () => {
    const UserManager = _newTestUserManager();
    await UserManager.loginAsync('user-pass', {
      username: userForTest.username,
      password: userForTestPassword,
    });

    const user = await UserManager.getCurrentUserAsync();
    expect(user).not.toBeNull();
    if (!user) {
      return;
    }
    expect(user.username).toBe(userForTest.username);
    expect(user.sessionSecret).not.toBeFalsy();
  });

  it('should use cached user after first run of getCurrentUserAsync() instead of making call to www', async () => {
    const UserManager = _newTestUserManager();
    await UserManager.loginAsync('user-pass', {
      username: userForTest.username,
      password: userForTestPassword,
    });

    // Spy on getProfileAsync
    const _getProfileSpy = jest.fn(UserManager._getProfileAsync);
    UserManager._getProfileAsync = _getProfileSpy;

    await UserManager.getCurrentUserAsync();

    expect(_getProfileSpy).not.toHaveBeenCalled();
  });

  it('should correctly use lock to prevent getting session twice, simulatenously', async () => {
    const UserManager = _newTestUserManager();
    await UserManager.loginAsync('user-pass', {
      username: userForTest.username,
      password: userForTestPassword,
    });

    UserManager._currentUser = null;

    // Spy on getProfileAsync
    const _getProfileSpy = jest.fn(UserManager._getProfileAsync);
    UserManager._getProfileAsync = _getProfileSpy;

    const [first, second] = await Promise.all([
      UserManager.getCurrentUserAsync(),
      UserManager.getCurrentUserAsync(),
    ]);

    expect(_getProfileSpy).toHaveBeenCalledTimes(1);

    // This shouldn't have changed, but just double check it
    expect(first).toEqual(second);
  });
});

function _newTestUserManager() {
  const UserManager = new UserManagerInstance();
  UserManager.initialize();
  return UserManager;
}
