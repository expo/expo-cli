/**
 * @flow
 */

import fs from 'fs-extra';
import path from 'path';
import HashIds from 'hashids';
import uuid from 'uuid';
import ApiV2Client from '../ApiV2';
import Api from '../Api';
import { UserManagerInstance } from '../User';
import UserSettings from '../UserSettings';
import FormData from '../tools/FormData';

const XDL_TEST_CLIENT_ID = 'o0YygTgKhOTdoWj10Yl9nY2P0SMTw38Y';

const _makeShortId = (salt: string, minLength: number = 10): string => {
  const hashIds = new HashIds(salt, minLength);
  return hashIds.encode(Date.now());
};

describe('User Sessions', () => {
  let userForTest;
  let userForTestPassword;

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
      testSession: true,
    });

    const user = await UserManager.getCurrentUserAsync();
    expect(user).not.toBeNull();
    if (!user) {
      return;
    }
    // expect auth0 tokens and session to be cached
    expect(user.username).toBe(userForTest.username);
    expect(user.idToken).not.toBeFalsy();
    expect(user.sessionSecret).toEqual('TEST');

    // expect auth0 tokens and session to be in state.json
    let { idToken, sessionSecret } = await UserSettings.getAsync('auth', {});

    expect(idToken).not.toBeFalsy();
    expect(sessionSecret).toEqual('TEST');
  });
  it('should remove a session token upon logout', async () => {
    const UserManager = _newTestUserManager();
    await UserManager.loginAsync('user-pass', {
      username: userForTest.username,
      password: userForTestPassword,
      testSession: true,
    });

    await UserManager.logoutAsync();

    // expect auth0 tokens and sesion to be removed
    let { idToken, sessionSecret } = await UserSettings.getAsync('auth', {});

    expect(idToken).toBe(undefined);
    expect(sessionSecret).toBe(undefined);
  });

  it('should use the token in apiv1', async () => {
    const UserManager = _newTestUserManager();
    await UserManager.loginAsync('user-pass', {
      username: userForTest.username,
      password: userForTestPassword,
      testSession: true,
    });

    let formData = new FormData();
    formData.append('queryType', 'history');
    formData.append('slug', 'foobar');

    let response = await Api.callMethodAsync(
      'publishInfo',
      [],
      'post',
      null,
      {
        formData,
      },
      true
    );
    const sessionHeaderReceived = response.headers['expo-session-response'];
    expect(sessionHeaderReceived).toEqual('received');
  });

  it('should use the token in apiv2', async () => {
    const UserManager = _newTestUserManager();
    await UserManager.loginAsync('user-pass', {
      username: userForTest.username,
      password: userForTestPassword,
      testSession: true,
    });

    const user = await UserManager.getCurrentUserAsync();
    const api = ApiV2Client.clientForUser(user);
    const response = await api.getAsync('auth/intercomUserHash', {}, {}, true);
    const sessionHeaderReceived = response.headers['expo-session-response'];
    expect(sessionHeaderReceived).toEqual('received');
  });

  it('migration endpoint should be contacted if there is no session', async () => {
    const UserManager = _newTestUserManager();
    await UserManager.loginAsync('user-pass', {
      username: userForTest.username,
      password: userForTestPassword,
    });
    let user = await UserManager.getCurrentUserAsync();

    // expect session to NOT be present
    expect(user.sessionSecret).toBe(undefined);
    let { sessionSecretOld } = await UserSettings.getAsync('auth', {});
    expect(sessionSecretOld).toBe(undefined);

    // migrate to sessions
    await UserManager.migrateAuth0ToSessionAsync({  testMode: true  });

    // expect session to be cached and stored in state.json
    expect(user.sessionSecret).toEqual('TEST');
    let { sessionSecret } = await UserSettings.getAsync('auth', {});
    expect(sessionSecret).toEqual('TEST');
  });
});

function _newTestUserManager() {
  const UserManager = new UserManagerInstance();
  UserManager.initialize(XDL_TEST_CLIENT_ID); // XDL Test Client
  return UserManager;
}
