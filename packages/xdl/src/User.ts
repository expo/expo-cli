import camelCase from 'lodash/camelCase';
import isEmpty from 'lodash/isEmpty';
import snakeCase from 'lodash/snakeCase';

import * as Analytics from './Analytics';
import ApiV2Client from './ApiV2';
import Config from './Config';
import Logger from './Logger';
import UserSettings, { UserData } from './UserSettings';
import { Semaphore } from './Utils';
import XDLError from './XDLError';

export type User = {
  kind: 'user';
  // required
  username: string;
  nickname: string;
  userId: string;
  picture: string;
  // optional
  email?: string;
  emailVerified?: boolean;
  givenName?: string;
  familyName?: string;
  userMetadata: {
    onboarded: boolean;
    legacy?: boolean;
  };
  // auth methods
  currentConnection: ConnectionType;
  sessionSecret?: string;
  accessToken?: string;
};

export type LegacyUser = {
  kind: 'legacyUser';
  username: string;
  userMetadata: {
    legacy: boolean;
    needsPasswordMigration: boolean;
  };
};

export type UserOrLegacyUser = User | LegacyUser;

export type ConnectionType =
  | 'Access-Token-Authentication'
  | 'Username-Password-Authentication'
  | 'facebook'
  | 'google-oauth2'
  | 'github';

export type RegistrationData = {
  username: string;
  password: string;
  email?: string;
  givenName?: string;
  familyName?: string;
};

// note: user-token isn't listed here because it's a non-persistent pre-authenticated method
export type LoginType = 'user-pass' | 'facebook' | 'google' | 'github';

export const ANONYMOUS_USERNAME = 'anonymous';

export class UserManagerInstance {
  _currentUser: User | null = null;
  _getSessionLock = new Semaphore();
  _interactiveAuthenticationCallbackAsync?: () => Promise<User>;

  static getGlobalInstance() {
    if (!__globalInstance) {
      __globalInstance = new UserManagerInstance();
    }
    return __globalInstance;
  }

  initialize() {
    this._currentUser = null;
    this._getSessionLock = new Semaphore();
  }

  /**
   * Logs in a user for a given login type.
   *
   * Valid login types are:
   *  - "user-pass": Username and password authentication
   *
   * If the login type is "user-pass", we directly make the request to www
   * to login a user.
   */
  async loginAsync(
    loginType: LoginType,
    loginArgs?: { username: string; password: string }
  ): Promise<User> {
    if (loginType === 'user-pass') {
      if (!loginArgs) {
        throw new Error(`The 'user-pass' login type requires a username and password.`);
      }
      const apiAnonymous = ApiV2Client.clientForUser();
      const loginResp = await apiAnonymous.postAsync('auth/loginAsync', {
        username: loginArgs.username,
        password: loginArgs.password,
      });
      if (loginResp.error) {
        throw new XDLError('INVALID_USERNAME_PASSWORD', loginResp['error_description']);
      }
      return this._getProfileAsync({
        currentConnection: 'Username-Password-Authentication',
        sessionSecret: loginResp.sessionSecret,
      });
    } else {
      throw new Error(`Invalid login type provided. Must be 'user-pass'.`);
    }
  }

  async registerAsync(
    userData: RegistrationData,
    user: UserOrLegacyUser | null = null
  ): Promise<User> {
    if (!user) {
      user = await this.getCurrentUserAsync();
    }

    if (user) {
      await this.logoutAsync();
      user = null;
    }

    try {
      // Create or update the profile
      let registeredUser = await this.createOrUpdateUserAsync({
        connection: 'Username-Password-Authentication', // Always create/update username password
        email: userData.email,
        givenName: userData.givenName,
        familyName: userData.familyName,
        username: userData.username,
        password: userData.password,
      });

      registeredUser = await this.loginAsync('user-pass', {
        username: userData.username,
        password: userData.password,
      });

      return registeredUser;
    } catch (e) {
      console.error(e);
      throw new XDLError('REGISTRATION_ERROR', 'Error registering user: ' + e.message);
    }
  }

  /**
   * Ensure user is logged in and has a valid token.
   *
   * If there are any issues with the login, this method throws.
   */
  async ensureLoggedInAsync(): Promise<User> {
    if (Config.offline) {
      throw new XDLError('NETWORK_REQUIRED', "Can't verify user without network access");
    }

    let user = await this.getCurrentUserAsync({ silent: true });
    if (!user && this._interactiveAuthenticationCallbackAsync) {
      user = await this._interactiveAuthenticationCallbackAsync();
    }
    if (!user) {
      throw new XDLError('NOT_LOGGED_IN', 'Not logged in');
    }
    return user;
  }

  setInteractiveAuthenticationCallback(callback: () => Promise<User>) {
    this._interactiveAuthenticationCallbackAsync = callback;
  }

  async _readUserData(): Promise<UserData | null> {
    let auth = await UserSettings.getAsync('auth', null);
    if (isEmpty(auth)) {
      // XXX(ville):
      // We sometimes read an empty string from ~/.expo/state.json,
      // even though it has valid credentials in it.
      // We don't know why.
      // An empty string can't be parsed as JSON, so an empty default object is returned.
      // In this case, retrying usually helps.
      auth = await UserSettings.getAsync('auth', null);
    }
    if (typeof auth === 'undefined') {
      return null;
    }
    return auth;
  }

  /**
   * Get the current user based on the available token.
   * If there is no current token, returns null.
   */
  async getCurrentUserAsync(options?: { silent?: boolean }): Promise<User | null> {
    await this._getSessionLock.acquire();

    try {
      const currentUser = this._currentUser;

      // If user is cached and there is an accessToken or sessionSecret, return the user
      if (currentUser && (currentUser.accessToken || currentUser.sessionSecret)) {
        return currentUser;
      }

      if (Config.offline) {
        return null;
      }

      const data = await this._readUserData();
      const accessToken = UserSettings.accessToken();

      // No token, no session, no current user. Need to login
      if (!accessToken && !data?.sessionSecret) {
        return null;
      }

      try {
        if (accessToken) {
          return await this._getProfileAsync({
            accessToken,
            currentConnection: 'Access-Token-Authentication',
          });
        }

        return await this._getProfileAsync({
          currentConnection: data?.currentConnection,
          sessionSecret: data?.sessionSecret,
        });
      } catch (e) {
        if (!(options && options.silent)) {
          Logger.global.warn('Fetching the user profile failed');
          Logger.global.warn(e);
        }
        if (e.code === 'UNAUTHORIZED_ERROR') {
          return null;
        }
        throw e;
      }
    } finally {
      this._getSessionLock.release();
    }
  }

  async getCurrentUsernameAsync(): Promise<string | null> {
    const token = UserSettings.accessToken();
    if (token) {
      const user = await this.getCurrentUserAsync();
      if (user?.username) {
        return user.username;
      }
    }
    const data = await this._readUserData();
    if (data?.username) {
      return data.username;
    }
    return null;
  }

  async getSessionAsync(): Promise<{ sessionSecret?: string; accessToken?: string } | null> {
    const token = UserSettings.accessToken();
    if (token) {
      return { accessToken: token };
    }
    const data = await this._readUserData();
    if (data?.sessionSecret) {
      return { sessionSecret: data.sessionSecret };
    }
    return null;
  }

  /**
   * Create or update a user.
   */
  async createOrUpdateUserAsync(userData: object): Promise<User | null> {
    let currentUser = this._currentUser;
    if (!currentUser) {
      // attempt to get the current user
      currentUser = await this.getCurrentUserAsync();
    }

    const api = ApiV2Client.clientForUser(currentUser);

    const { user: updatedUser } = await api.postAsync('auth/createOrUpdateUser', {
      userData: _prepareAuth0Profile(userData),
    });

    this._currentUser = {
      ...this._currentUser,
      ..._parseAuth0Profile(updatedUser),
      kind: 'user',
    };
    return this._currentUser;
  }

  /**
   * Logout
   */
  async logoutAsync(): Promise<void> {
    // Only send logout events events for users without access tokens
    if (this._currentUser && !this._currentUser?.accessToken) {
      Analytics.logEvent('Logout', {
        userId: this._currentUser.userId,
        username: this._currentUser.username,
        currentConnection: this._currentUser.currentConnection,
      });
    }

    this._currentUser = null;

    // Delete saved auth info
    await UserSettings.deleteKeyAsync('auth');
  }

  /**
   * Forgot Password
   */
  async forgotPasswordAsync(usernameOrEmail: string): Promise<void> {
    const apiAnonymous = ApiV2Client.clientForUser();
    return apiAnonymous.postAsync('auth/forgotPasswordAsync', {
      usernameOrEmail,
    });
  }

  /**
   * Get profile given token data. Errors if token is not valid or if no
   * user profile is returned.
   *
   * This method is called by all public authentication methods of `UserManager`
   * except `logoutAsync`. Therefore, we use this method as a way to:
   *  - update the UserSettings store with the current token and user id
   *  - update UserManager._currentUser
   *  - Fire login analytics events
   *
   * Also updates UserManager._currentUser.
   *
   * @private
   */
  async _getProfileAsync({
    currentConnection,
    sessionSecret,
    accessToken,
  }: {
    currentConnection?: ConnectionType;
    sessionSecret?: string;
    accessToken?: string;
  }): Promise<User> {
    let user;
    const api = ApiV2Client.clientForUser({
      sessionSecret,
      accessToken,
    });

    user = await api.postAsync('auth/userProfileAsync');

    if (!user) {
      throw new Error('Unable to fetch user.');
    }

    user = {
      ..._parseAuth0Profile(user),
      kind: 'user',
      currentConnection,
      sessionSecret,
      accessToken,
    };

    // note: do not persist the authorization token, must be env-var only
    if (!accessToken) {
      await UserSettings.setAsync('auth', {
        userId: user.userId,
        username: user.username,
        currentConnection,
        sessionSecret,
      });
    }

    // If no currentUser, or currentUser.id differs from profiles
    // user id, that means we have a new login
    if (
      (!this._currentUser || this._currentUser.userId !== user.userId) &&
      user.username &&
      user.username !== ''
    ) {
      if (!accessToken) {
        // Only send login events for users without access tokens
        Analytics.logEvent('Login', {
          userId: user.userId,
          currentConnection: user.currentConnection,
          username: user.username,
        });
      }

      Analytics.setUserProperties(user.username, {
        userId: user.userId,
        currentConnection: user.currentConnection,
        username: user.username,
        userType: user.kind,
      });
    }

    this._currentUser = user;

    return user;
  }
}

let __globalInstance: UserManagerInstance | undefined;
export default UserManagerInstance.getGlobalInstance();

/** Private Methods **/
function _parseAuth0Profile(rawProfile: any) {
  if (!rawProfile || typeof rawProfile !== 'object') {
    return rawProfile;
  }
  return Object.keys(rawProfile).reduce((p, key) => {
    p[camelCase(key)] = _parseAuth0Profile(rawProfile[key]);
    return p;
  }, {} as any);
}

function _prepareAuth0Profile(niceProfile: any) {
  if (typeof niceProfile !== 'object') {
    return niceProfile;
  }

  return Object.keys(niceProfile).reduce((p, key) => {
    p[snakeCase(key)] = _prepareAuth0Profile(niceProfile[key]);
    return p;
  }, {} as any);
}
