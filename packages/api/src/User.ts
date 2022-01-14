import Analytics from './Analytics';
import * as Auth from './Auth';
import Config from './Config';
import { Semaphore } from './Semaphore';
import UnifiedAnalytics from './UnifiedAnalytics';
import UserSettings from './UserSettings';
import { AuthError } from './utils/errors';

export const ANONYMOUS_USERNAME = 'anonymous';

export class UserManagerInstance {
  _currentUser: Auth.User | Auth.RobotUser | null = null;
  _getSessionLock = new Semaphore();
  _interactiveAuthenticationCallbackAsync?: () => Promise<Auth.User>;

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
    loginType: Auth.LoginType,
    loginArgs?: { username: string; password: string; otp?: string }
  ): Promise<Auth.User> {
    const sessionSecret = await Auth.loginAsync(loginType, loginArgs);
    const user = await this._getProfileAsync({
      currentConnection: 'Username-Password-Authentication',
      sessionSecret,
    });
    return user as Auth.User;
  }

  async registerAsync(
    userData: Auth.RegistrationData,
    user: Auth.UserOrLegacyUser | null = null
  ): Promise<Auth.User> {
    let actor: Auth.UserOrLegacyUser | Auth.RobotUser | null = user;

    if (!actor) {
      actor = await this.getCurrentUserAsync();
    }

    if (actor) {
      await this.logoutAsync();
      actor = null;
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
    } catch (e: any) {
      console.error(e);
      throw new AuthError('REGISTRATION_ERROR', 'Error registering user: ' + e.message);
    }
  }

  /**
   * Ensure user is logged in and has a valid token.
   *
   * If there are any issues with the login, this method throws.
   */
  async ensureLoggedInAsync(): Promise<Auth.User | Auth.RobotUser> {
    if (Config.isOffline) {
      throw new AuthError('NETWORK_REQUIRED', "Can't verify user without network access");
    }

    let user = await this.getCurrentUserAsync({ silent: true });
    if (!user && this._interactiveAuthenticationCallbackAsync) {
      user = await this._interactiveAuthenticationCallbackAsync();
    }
    if (!user) {
      throw new AuthError('NOT_LOGGED_IN', 'Not logged in');
    }
    return user;
  }

  setInteractiveAuthenticationCallback(callback: () => Promise<Auth.User>) {
    this._interactiveAuthenticationCallbackAsync = callback;
  }

  async _readUserData(): Promise<Auth.UserData | null> {
    let auth = await UserSettings.getAsync('auth', null);
    if (!auth || !Object.keys(auth).length) {
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
   * Returns cached user data without hitting our backend. Only works for 'Username-Password-Authentication' flow. Does not work with 'Access-Token-Authentication' flow.
   */
  getCachedUserDataAsync = async (): Promise<Auth.UserData | null> => {
    await this._getSessionLock.acquire();

    try {
      const currentUser = this._currentUser;
      // If user is cached and there is an accessToken or sessionSecret, return the user
      if (currentUser && (currentUser.accessToken || currentUser.sessionSecret)) {
        return currentUser;
      }

      const userData = await this._readUserData();

      // // No token, no session, no current user. Need to login
      if (!userData?.sessionSecret) {
        return null;
      }

      return userData;
    } catch (e) {
      console.warn(e);
      return null;
    } finally {
      this._getSessionLock.release();
    }
  };

  /**
   * Get the current user based on the available token.
   * If there is no current token, returns null.
   */
  async getCurrentUserAsync(options?: {
    silent?: boolean;
  }): Promise<Auth.User | Auth.RobotUser | null> {
    await this._getSessionLock.acquire();

    try {
      const currentUser = this._currentUser;

      // If user is cached and there is an accessToken or sessionSecret, return the user
      if (currentUser?.accessToken || currentUser?.sessionSecret) {
        return currentUser;
      }

      if (Config.isOffline) {
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
      } catch (e: any) {
        if (!(options && options.silent)) {
          // TODO: Custom logger?
          console.warn('Fetching the user profile failed');
          console.warn(e);
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

  /**
   * Get the current user and check if it's a robot.
   * If the user is not a robot, it will throw an error.
   */
  async getCurrentUserOnlyAsync(): Promise<Auth.User | null> {
    const user = await this.getCurrentUserAsync();
    if (user && user.kind !== 'user') {
      throw new AuthError('ROBOT_ACCOUNT_ERROR', 'This action is not supported for robot users.');
    }
    return user;
  }

  /**
   * Get the current user and check if it's a robot.
   * If the user is not a robot, it will throw an error.
   */
  async getCurrentRobotUserOnlyAsync(): Promise<Auth.RobotUser | null> {
    const user = await this.getCurrentUserAsync();
    if (user && user.kind !== 'robot') {
      throw new AuthError('USER_ACCOUNT_ERROR', 'This action is not supported for normal users.');
    }
    return user;
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
    return data?.username ?? null;
  }

  async getSessionAsync(): Promise<{ sessionSecret?: string; accessToken?: string } | null> {
    const token = UserSettings.accessToken();
    if (token) {
      return { accessToken: token };
    }
    const data = await this._readUserData();
    return data?.sessionSecret ? { sessionSecret: data.sessionSecret } : null;
  }

  /**
   * Create or update a user.
   */
  async createOrUpdateUserAsync(userData: object): Promise<Auth.User | null> {
    let currentUser = this._currentUser;
    if (!currentUser) {
      // attempt to get the current user
      currentUser = await this.getCurrentUserAsync();
    }

    const updatedUser = await Auth.createOrUpdateUserAsync(
      currentUser,
      _prepareAuth0Profile(userData)
    );

    this._currentUser = {
      ...this._currentUser,
      ..._parseAuth0Profile(updatedUser),
      kind: 'user',
    } as Auth.User;

    return this._currentUser;
  }

  /**
   * Logout
   */
  async logoutAsync(): Promise<void> {
    if (this._currentUser?.kind === 'robot') {
      throw new AuthError('ROBOT_ACCOUNT_ERROR', 'This action is not available for robot users');
    }

    // Only send logout events events for users without access tokens
    if (this._currentUser && !this._currentUser?.accessToken) {
      Analytics.logEvent('Logout', {
        userId: this._currentUser.userId,
        currentConnection: this._currentUser.currentConnection,
      });
    }

    this._currentUser = null;

    // Delete saved auth info
    await UserSettings.deleteKeyAsync('auth');
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
    currentConnection?: Auth.ConnectionType;
    sessionSecret?: string;
    accessToken?: string;
  }): Promise<Auth.User | Auth.RobotUser> {
    const _user = await Auth.getUserInfoAsync();
    const user = {
      ..._parseAuth0Profile(_user),
      // We need to inherit the "robot" type only, the rest is considered "user" but returned as "person".
      kind: _user.user_type === 'robot' ? 'robot' : 'user',
      currentConnection,
      sessionSecret,
      accessToken,
    };

    // Create a "username" to use in current terminal UI (e.g. expo whoami)
    if (user.kind === 'robot') {
      user.username = user.givenName ? `${user.givenName} (robot)` : 'robot';
    }

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
        });
      }

      UnifiedAnalytics.identifyUser(user.userId, {
        userId: user.userId,
        currentConnection: user.currentConnection,
        username: user.username,
        userType: user.kind,
        primaryAccountId: user.primaryAccountId,
      });

      Analytics.identifyUser(user.userId, {
        userId: user.userId,
        currentConnection: user.currentConnection,
        username: user.username,
        userType: user.kind,
        primaryAccountId: user.primaryAccountId,
      });
    }

    this._currentUser = user;

    return user;
  }
}

let __globalInstance: UserManagerInstance | undefined;
export default new UserManagerInstance();

const toCamelCase = (str: string) => {
  return str.replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
};

const toSnakeCase = (str: string) => {
  return str.replace(/([a-z][A-Z])/g, group => group.replace(' ', '_').toLowerCase());
};

/** Private Methods **/
function _parseAuth0Profile(rawProfile: any) {
  if (!rawProfile || typeof rawProfile !== 'object') {
    return rawProfile;
  }
  return Object.keys(rawProfile).reduce((p, key) => {
    p[toCamelCase(key)] = _parseAuth0Profile(rawProfile[key]);
    return p;
  }, {} as any);
}

function _prepareAuth0Profile(niceProfile: any) {
  if (typeof niceProfile !== 'object') {
    return niceProfile;
  }

  return Object.keys(niceProfile).reduce((p, key) => {
    p[toSnakeCase(key)] = _prepareAuth0Profile(niceProfile[key]);
    return p;
  }, {} as any);
}
