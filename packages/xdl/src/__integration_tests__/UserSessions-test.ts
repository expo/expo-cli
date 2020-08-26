import fs from 'fs-extra';
import HashIds from 'hashids';
import path from 'path';
import uuid from 'uuid';

import ApiV2Client from '../ApiV2';
import { User, UserManagerInstance } from '../User';
import UserSettings from '../UserSettings';

const _makeShortId = (salt: string, minLength = 10) => {
  const hashIds = new HashIds(salt, minLength);
  return hashIds.encode(Date.now());
};

// Note: these tests are actually calling the API,
// in the unit test "User-test.ts" the API is mocked and the same tests are executed.
describe.skip('User Sessions', () => {
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

  it('should login successfully, and persist a session token upon login', async () => {
    const UserManager = _newTestUserManager();
    await UserManager.loginAsync('user-pass', {
      username: userForTest.username,
      password: userForTestPassword,
      // testSession: true,
    });

    const user = await UserManager.getCurrentUserAsync();
    expect(user).not.toBeNull();
    if (!user) {
      return;
    }
    // expect session to be cached
    expect(user.username).toBe(userForTest.username);
    expect(user.sessionSecret).not.toBe(undefined);

    // expect session to be in state.json
    const auth = await UserSettings.getAsync('auth', null);
    expect(auth?.sessionSecret).not.toBe(undefined);
  });

  it('should remove a session token upon logout', async () => {
    const UserManager = _newTestUserManager();
    await UserManager.loginAsync('user-pass', {
      username: userForTest.username,
      password: userForTestPassword,
    });

    await UserManager.logoutAsync();

    // expect session to be removed
    const auth = await UserSettings.getAsync('auth', null);
    expect(auth?.sessionSecret).toBe(undefined);
  });

  it('should use the token in apiv2', async () => {
    const UserManager = _newTestUserManager();
    await UserManager.loginAsync('user-pass', {
      username: userForTest.username,
      password: userForTestPassword,
    });

    const user = await UserManager.getCurrentUserAsync();
    const api = ApiV2Client.clientForUser(user);
    const response = await api.getAsync('auth/intercomUserHash', {}, {}, true);
    expect(response.status).toBe(200);
  });
});

function _newTestUserManager() {
  const UserManager = new UserManagerInstance();
  UserManager.initialize();
  return UserManager;
}
