import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import uuid from 'uuid';

import ApiV2 from '../ApiV2';
import GlobalUserManager, { UserManagerInstance } from '../User';
import UserSettings from '../UserSettings';

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

  describe('credentials', () => {
    it('authenticates with credentials', async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();

      // Mock login response and authenticate
      api.postAsync.mockResolvedValue({ sessionSecret: 'session-secret' });
      await manager.loginAsync('user-pass', { username: 'expouser', password: 'expopass' });
      expect(await manager.getCurrentUserAsync()).toHaveProperty('sessionSecret', 'session-secret');
    });

    it('locks to prevent fetching user twice, simultaneously', async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();

      // Mock login response and authenticate
      api.postAsync.mockResolvedValue({ sessionSecret: 'session-secret' });
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
      expect(first).toBe(second);

      profileSpy.mockRestore();
    });

    it('adds user data to cache when authenticating with credentials', async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();

      // Mock login response and authenticate
      api.postAsync.mockResolvedValue({ sessionSecret: 'session-secret' });
      await manager.loginAsync('user-pass', { username: 'expouser', password: 'expopass' });

      // Check if the profile is loaded from cache instead of API
      const profileSpy = jest.spyOn(manager, '_getProfileAsync');
      await manager.getCurrentUserAsync();
      expect(profileSpy).not.toBeCalled();

      // Check if the settings-cache has the token
      const auth = await UserSettings.getAsync('auth', null);
      expect(auth?.sessionSecret).toBe('session-secret');

      profileSpy.mockRestore();
    });

    it('removes user data from cache when logging out', async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();

      // Mock login response and authenticate
      api.postAsync.mockResolvedValue({ sessionSecret: 'session-secret' });
      await manager.loginAsync('user-pass', { username: 'expouser', password: 'expopass' });

      // Check if the settings-cache has the token
      expect(await UserSettings.getAsync('auth', null)).toHaveProperty(
        'sessionSecret',
        'session-secret'
      );

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
      api.postAsync.mockResolvedValue({ authorizationToken: 'auth-token' });
      expect(await manager.getCurrentUserAsync()).toHaveProperty(
        'authorizationToken',
        'auth-token'
      );
    });

    it(`doesn't cache user when authenticating with credentials`, async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();
      const settingSpy = jest.spyOn(UserSettings, 'setAsync');

      // Mock authorization token response and fetch the user
      process.env.EXPO_TOKEN = 'auth-token';
      api.postAsync.mockResolvedValue({ authorizationToken: 'auth-token' });
      expect(await manager.getCurrentUserAsync()).toHaveProperty(
        'authorizationToken',
        'auth-token'
      );
      // Note: unfortunately, there is no other way to see if the user data was cached
      expect(UserSettings.setAsync).not.toBeCalled();

      settingSpy.mockRestore();
    });

    it('uses token over existing credentials session', async () => {
      const api = _newTestApiV2();
      const manager = _newTestUserManager();

      // Mock login response and authenticate
      api.postAsync.mockResolvedValue({ sessionSecret: 'session-secret' });
      await manager.loginAsync('user-pass', { username: 'expouser', password: 'expopass' });
      expect(await manager.getCurrentUserAsync()).toHaveProperty('sessionSecret', 'session-secret');

      // Empty in-memory cache, to force-fetch it
      manager._currentUser = null;

      // Mock token response and get user
      process.env.EXPO_TOKEN = 'auth-token';
      api.postAsync.mockResolvedValue({ authorizationToken: 'auth-token' });
      const user = await manager.getCurrentUserAsync();
      expect(user).toHaveProperty('authorizationToken', 'auth-token');
      expect(user).not.toHaveProperty('sessionSecret', 'session-secret');
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
    authorizationToken: null,
    getAsync: jest.fn(),
    postAsync: jest.fn(),
    putAsync: jest.fn(),
    patchAsync: jest.fn(),
    deleteAsync: jest.fn(),
    uploadFormDataAsync: jest.fn(),
    _requestAsync: jest.fn(),
  };

  (ApiV2.clientForUser as jest.Mock).mockReturnValue(api);

  return api;
}
