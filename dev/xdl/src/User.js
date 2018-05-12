/**
 * @flow
 */

import _ from 'lodash';
import isEmpty from 'lodash/isEmpty';
import freeportAsync from 'freeport-async';
import http from 'http';
import qs from 'querystring';
import opn from 'opn';
import promisify from 'util.promisify';

import ApiV2Client, { ApiV2Error } from './ApiV2';
import * as Analytics from './Analytics';
import Config from './Config';
import ErrorCode from './ErrorCode';
import XDLError from './XDLError';
import Logger from './Logger';

import * as Intercom from './Intercom';
import UserSettings from './UserSettings';

import { Semaphore } from './Utils';
import { isNode } from './tools/EnvironmentHelper';

export type User = {
  kind: 'user',
  // required
  name: string,
  username: string,
  nickname: string,
  userId: string,
  picture: string,
  // optional
  email?: string,
  emailVerified?: boolean,
  givenName?: string,
  familyName?: string,
  loginsCount?: number,
  intercomUserHash: string,
  userMetadata: {
    onboarded: boolean,
    legacy?: boolean,
  },
  identities: Array<{
    connection: ConnectionType,
    isSocial: boolean,
    provider: string,
    userId: string,
  }>,
  currentConnection: ConnectionType,
  sessionSecret: string,
};

export type LegacyUser = {
  kind: 'legacyUser',
  username: string,
  userMetadata: {
    legacy: boolean,
    needsPasswordMigration: boolean,
  },
};

export type UserOrLegacyUser = User | LegacyUser;

type ConnectionType = 'Username-Password-Authentication' | 'facebook' | 'google-oauth2' | 'github';

type LoginOptions = {
  connection: ConnectionType,
  device: string,
  responseType: string,
  responseMode: string,
  username?: string,
  password?: string,
};

export type RegistrationData = {
  username: string,
  password: string,
  email?: string,
  givenName?: string,
  familyName?: string,
};

export type LoginType = 'user-pass' | 'facebook' | 'google' | 'github';

export class UserManagerInstance {
  loginServer = null;
  refreshSessionThreshold = 60 * 60; // 1 hour
  _currentUser: ?User = null;
  _getSessionLock = new Semaphore();

  static getGlobalInstance() {
    if (!__globalInstance) {
      __globalInstance = new UserManagerInstance();
    }
    return __globalInstance;
  }

  initialize() {
    this.loginServer = null;
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
    loginArgs?: { username: string, password: string }
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
        throw new XDLError(ErrorCode.INVALID_USERNAME_PASSWORD, loginResp['error_description']);
      }
      return this._getProfileAsync({
        currentConnection: 'Username-Password-Authentication',
        sessionSecret: loginResp.sessionSecret,
      });
    } else {
      throw new Error(`Invalid login type provided. Must be 'user-pass'.`);
    }
  }

  async registerAsync(userData: RegistrationData, user: ?UserOrLegacyUser): Promise<User> {
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
      throw new XDLError(ErrorCode.REGISTRATION_ERROR, 'Error registering user: ' + e.message);
    }
  }

  /**
   * Ensure user is logged in and has a valid token.
   *
   * If there are any issues with the login, this method throws.
   */
  async ensureLoggedInAsync(): Promise<?User> {
    if (Config.offline) {
      return null;
    }

    const user = await this.getCurrentUserAsync();
    if (!user) {
      throw new XDLError(ErrorCode.NOT_LOGGED_IN, 'Not logged in');
    }
    return user;
  }

  /**
   * Get the current user based on the available token.
   * If there is no current token, returns null.
   */
  async getCurrentUserAsync(): Promise<?User> {
    await this._getSessionLock.acquire();

    try {
      // If user is cached and there is a sessionSecret, return the user
      if (this._currentUser && this._currentUser.sessionSecret) {
        return this._currentUser;
      }

      if (Config.offline) {
        return null;
      }

      // Not cached, check for token
      let auth = await UserSettings.getAsync('auth', {});
      if (isEmpty(auth)) {
        // XXX(ville):
        // We sometimes read an empty string from ~/.expo/state.json,
        // even though it has valid credentials in it.
        // We don't know why.
        // An empty string can't be parsed as JSON, so an empty default object is returned.
        // In this case, retrying usually helps.
        auth = await UserSettings.getAsync('auth', {});
      }
      let { currentConnection, sessionSecret } = auth;

      // No session, no current user. Need to login
      if (!sessionSecret) {
        return null;
      }

      try {
        return await this._getProfileAsync({
          currentConnection,
          sessionSecret,
        });
      } catch (e) {
        Logger.global.error(e);
        // Surface network errors
        if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND' || e.code === 'ETIMEDOUT') {
          throw new Error(
            'Could not connect to the server. Please check your internet connection.'
          );
        }
        // This logs us out if theres a fatal error when getting the profile with
        // current access token
        await this.logoutAsync();
        return null;
      }
    } finally {
      this._getSessionLock.release();
    }
  }

  /**
   * Create or update a user.
   */
  async createOrUpdateUserAsync(userData: Object): Promise<User> {
    let currentUser = this._currentUser;
    if (!currentUser) {
      // attempt to get the current user
      currentUser = await this.getCurrentUserAsync();
    }

    try {
      const api = ApiV2Client.clientForUser(this._currentUser);

      const { user: updatedUser } = await api.postAsync('auth/createOrUpdateUser', {
        userData: _prepareAuth0Profile(userData),
      });

      this._currentUser = {
        ...(this._currentUser || {}),
        ..._parseAuth0Profile(updatedUser),
      };
      return {
        kind: 'user',
        ...this._currentUser,
      };
    } catch (e) {
      const err: ApiV2Error = (e: any);
      if (err.code === 'AUTHENTICATION_ERROR') {
        throw new Error(err.details.message);
      }
      throw e;
    }
  }

  /**
   * Logout
   */
  async logoutAsync(): Promise<void> {
    if (this._currentUser) {
      Analytics.logEvent('Logout', {
        username: this._currentUser.username,
      });
    }

    this._currentUser = null;

    // Delete saved auth info
    await UserSettings.deleteKeyAsync('auth');

    // Logout of Intercom
    Intercom.update(null);
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
   *  - Update the currently assigned Intercom user
   *
   * Also updates UserManager._currentUser.
   *
   * @private
   */
  async _getProfileAsync({
    currentConnection,
    sessionSecret,
  }: {
    currentConnection: ConnectionType,
    sessionSecret: string,
  }): Promise<User> {
    let user;
    let api = ApiV2Client.clientForUser({
      sessionSecret,
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
    };

    await UserSettings.mergeAsync({
      auth: {
        userId: user.userId,
        username: user.username,
        currentConnection,
        sessionSecret,
      },
    });

    // If no currentUser, or currentUser.id differs from profiles
    // user id, that means we have a new login
    if (
      (!this._currentUser || this._currentUser.userId !== user.userId) &&
      user.username &&
      user.username !== ''
    ) {
      Analytics.logEvent('Login', {
        userId: user.userId,
        currentConnection: user.currentConnection,
        username: user.username,
      });

      Analytics.setUserProperties(user.username, {
        userId: user.userId,
        currentConnection: user.currentConnection,
        username: user.username,
      });

      if (user.intercomUserHash) {
        Intercom.update(user);
      }
    } else {
      Intercom.update(null);
    }

    this._currentUser = user;

    return user;
  }
}

let __globalInstance;
export default UserManagerInstance.getGlobalInstance();

/** Private Methods **/
function _parseAuth0Profile(rawProfile: any): User {
  if (!rawProfile || typeof rawProfile !== 'object') {
    return rawProfile;
  }
  return ((Object.keys(rawProfile).reduce((p, key) => {
    p[_.camelCase(key)] = _parseAuth0Profile(rawProfile[key]);
    return p;
  }, {}): any): User);
}

function _prepareAuth0Profile(niceProfile: any): Object {
  if (typeof niceProfile !== 'object') {
    return niceProfile;
  }

  return ((Object.keys(niceProfile).reduce((p, key) => {
    p[_.snakeCase(key)] = _prepareAuth0Profile(niceProfile[key]);
    return p;
  }, {}): any): User);
}
