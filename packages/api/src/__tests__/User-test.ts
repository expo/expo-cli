import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import uuid from 'uuid';

import { ApiV2, UserManager as GlobalUserManager, UserManagerInstance, UserSettings } from '../';

jest.mock('../ApiV2', () => ({
  clientForUser: jest.fn(),
}));

describe('User', () => {
  // for some reason, tempy fails with memfs in XDL
  const expoDir = path.join(os.tmpdir(), `.expo-${uuid.v4()}`);

  beforeAll(() => {
    process.env.__UNSAFE_EXPO_HOME_DIRECTORY = expoDir;
    fs.mkdirpSync(expoDir);
  });

  afterAll(() => {
    process.env.__UNSAFE_EXPO_HOME_DIRECTORY = '';
    fs.removeSync(expoDir);
  });

  it('uses a UserManager singleton', () => {
    const { default: manager } = jest.requireActual('../User');
    expect(manager).toBe(GlobalUserManager);
  });

  it('is logged out by default', async () => {
    const manager = _newTestUserManager();
    await expect(manager.ensureLoggedInAsync()).rejects.toThrowError('Not logged in');
  });

  it('returns no session when logged out', async () => {
    const manager = _newTestUserManager();
    expect(await manager.getSessionAsync()).toBeNull();
  });

  describe('credentials', () => {
    it('authenticates with credentials', async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();

      // Mock login and profile requests
      api.postAsync.mockResolvedValue({ sessionSecret: 'session-secret-auth' });
      api.getAsync.mockResolvedValue({ username: 'user-auth' });

      // Login and get current user
      await manager.loginAsync('user-pass', { username: 'user-auth', password: 'expopass' });
      const user = await manager.getCurrentUserAsync();

      // Check if the user has the auth method and expected username
      expect(user).toMatchObject({
        sessionSecret: 'session-secret-auth',
        username: 'user-auth',
      });
    });

    it('locks to prevent fetching user twice, simultaneously', async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();

      // Mock login and profile requests
      api.postAsync.mockResolvedValue({ sessionSecret: 'session-secret' });
      api.getAsync
        .mockResolvedValueOnce({ username: 'should-not-be-requested' })
        .mockResolvedValueOnce({ username: 'user-login-lock' });

      await manager.loginAsync('user-pass', { username: 'expouser', password: 'expopass' });

      // Empty in-memory cache, to force-fetch it
      manager._currentUser = null;

      // Check if the profile is fetched from API once
      const profileSpy = jest.spyOn(manager, '_getProfileAsync');
      const [first, second] = await Promise.all([
        manager.getCurrentUserAsync(),
        manager.getCurrentUserAsync(),
      ]);

      expect(profileSpy).toBeCalledTimes(1);
      expect(first).toHaveProperty('username', 'user-login-lock');
      expect(first).toBe(second);

      profileSpy.mockRestore();
    });

    it('adds user data to cache when authenticating with credentials', async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();

      // Mock login and profile requests
      api.postAsync.mockResolvedValue({ sessionSecret: 'session-secret-settings-persist' });
      api.getAsync.mockResolvedValue({ username: 'user-settings-persist' });

      await manager.loginAsync('user-pass', { username: 'expouser', password: 'expopass' });

      // Check if the profile is loaded from cache instead of API
      const profileSpy = jest.spyOn(manager, '_getProfileAsync');
      await manager.getCurrentUserAsync();
      expect(profileSpy).not.toBeCalled();

      // Check if the settings-cache has the username and session secret
      expect(await UserSettings.getAsync('auth', null)).toMatchObject({
        username: 'user-settings-persist',
        sessionSecret: 'session-secret-settings-persist',
      });

      profileSpy.mockRestore();
    });

    it('removes user data from cache when logging out', async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();

      // Mock login and profile requests
      api.postAsync.mockResolvedValue({ sessionSecret: 'session-secret-settings-reset' });
      api.getAsync.mockResolvedValue({ username: 'user-settings-reset' });

      await manager.loginAsync('user-pass', { username: 'expouser', password: 'expopass' });

      // Check if the settings-cache has the token
      expect(await UserSettings.getAsync('auth', null)).toMatchObject({
        username: 'user-settings-reset',
        sessionSecret: 'session-secret-settings-reset',
      });

      // Log user out and check if the cache is empty
      await manager.logoutAsync();
      expect(await UserSettings.getAsync('auth', null)).toBeNull();
    });
  });

  describe('token', () => {
    afterEach(() => {
      process.env.EXPO_TOKEN = '';
    });

    it('authenticates with token', async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();

      // Mock authorization token response and fetch the user
      process.env.EXPO_TOKEN = 'auth-token';
      api.getAsync.mockResolvedValue({ username: 'user-auth-token', accessToken: 'auth-token' });

      expect(await manager.getCurrentUserAsync()).toMatchObject({
        username: 'user-auth-token',
        accessToken: 'auth-token',
      });
    });

    it(`doesn't cache user when authenticating with credentials`, async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();
      const settingSpy = jest.spyOn(UserSettings, 'setAsync');

      // Mock authorization token response and fetch the user
      process.env.EXPO_TOKEN = 'auth-token';
      api.getAsync.mockResolvedValue({ username: 'user-auth-token', accessToken: 'auth-token' });

      expect(await manager.getCurrentUserAsync()).toBeDefined();
      // Note: unfortunately, there is no other way to see if the user data was cached
      expect(UserSettings.setAsync).not.toBeCalled();

      settingSpy.mockRestore();
    });

    it('uses token over existing credentials session', async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();

      // Mock login response and authenticate
      api.postAsync.mockResolvedValue({ sessionSecret: 'session-secret-credentials' });
      api.getAsync.mockResolvedValue({ username: 'user-credentials' });
      await manager.loginAsync('user-pass', { username: 'user-credentials', password: 'expopass' });
      expect(await manager.getCurrentUserAsync()).toMatchObject({
        username: 'user-credentials',
        sessionSecret: 'session-secret-credentials',
      });

      // Empty in-memory cache, to force-fetch it
      manager._currentUser = null;

      // Mock token response and get user
      process.env.EXPO_TOKEN = 'auth-token';
      api.getAsync.mockResolvedValue({ username: 'user-token', accessToken: 'auth-token' });
      const user = await manager.getCurrentUserAsync();
      expect(user).not.toHaveProperty('sessionSecret', 'session-secret');
      expect(user).toMatchObject({
        username: 'user-token',
        accessToken: 'auth-token',
      });
    });

    it('returns access token with token', async () => {
      const manager = _newTestUserManager();

      // Mock token, without logging in
      process.env.EXPO_TOKEN = 'auth-token';

      // Retrieve session and validate
      const session = await manager.getSessionAsync();
      expect(session).toHaveProperty('accessToken', 'auth-token');
      expect(session).not.toHaveProperty('sessionSecret');
    });
  });
});

function _newTestUserManager() {
  const manager = new UserManagerInstance();
  manager.initialize();
  return manager;
}

function _newTestApiV2() {
  const api = {
    sessionSecret: null,
    accessToken: null,
    getAsync: jest.fn(),
    postAsync: jest.fn(),
    putAsync: jest.fn(),
    patchAsync: jest.fn(),
    deleteAsync: jest.fn(),
    uploadFormDataAsync: jest.fn(),
    _requestAsync: jest.fn(),
  };

  (ApiV2.clientForUser as jest.MockedFunction<typeof ApiV2.clientForUser>).mockReturnValue(api);

  return api;
}
