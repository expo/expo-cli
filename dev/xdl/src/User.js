/**
 * @flow
 */

import _ from 'lodash';
import Bluebird from 'bluebird';
import freeportAsync from 'freeport-async';
import http from 'http';
import qs from 'querystring';
import opn from 'opn';
import jwt from 'jsonwebtoken';

import type Auth0JS from 'auth0-js';
import type Auth0Node from 'auth0';

import ApiV2Client, { ApiV2Error } from './ApiV2';

import * as Analytics from './Analytics';
import Config from './Config';
import ErrorCode from './ErrorCode';
import XDLError from './XDLError';
import Logger from './Logger';

import * as Intercom from './Intercom';
import UserSettings from './UserSettings';

import { Semaphore } from './Utils';

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
  accessToken: string,
  idToken: string,
  refreshToken: string,
  currentConnection: ConnectionType,
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

type ConnectionType =
  | 'Username-Password-Authentication'
  | 'facebook'
  | 'google-oauth2'
  | 'github';

type LoginOptions = {
  connection: ConnectionType,
  device: string,
  responseType: string,
  responseMode: string,
};

export type RegistrationData = {
  username: string,
  password: string,
  email?: string,
  givenName?: string,
  familyName?: string,
};

type Auth0Options = {
  clientID: string,
  callbackURL?: string,
};

export type LoginType = 'user-pass' | 'facebook' | 'google' | 'github';

const AUTH0_DOMAIN = 'exponent.auth0.com';
const AUTHENTICATION_SERVER_TIMEOUT = 1000 * 60 * 5; // 5 minutes

export class UserManagerInstance {
  clientID = 'o0YygTgKhOTdoWj10Yl9nY2P0SMTw38Y'; // Default Client ID
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

  initialize(clientID: ?string) {
    if (clientID) {
      this.clientID = clientID;
    }
    this.loginServer = null;
    this._currentUser = null;
    this._getSessionLock = new Semaphore();
  }

  /**
   * Logs in a user for a given login type.
   *
   * Valid login types are:
   *  - "user-pass": Username and password authentication
   *  - "facebook": Facebook authentication
   *  - "google": Google authentication
   *  - "github": Github authentication
   *
   * If the login type is "user-pass", we directly make the request to Auth0
   * to login a user.
   *
   * If the login type is any of the social providers, we start a web server
   * that can act as the receiver of the OAuth callback from the authentication
   * process. The response we receive on that web server will be token data.
   */
  async loginAsync(
    loginType: LoginType,
    loginArgs?: { username: string, password: string }
  ): Promise<User> {
    let loginOptions;

    if (loginType === 'user-pass') {
      if (!loginArgs) {
        throw new Error(
          `The 'user-pass' login type requires a username and password.`
        );
      }
      loginOptions = {
        connection: 'Username-Password-Authentication',
        responseType: 'token',
        sso: false,
        username: loginArgs.username,
        password: loginArgs.password,
      };
    } else if (loginType === 'facebook') {
      loginOptions = {
        connection: 'facebook',
      };
    } else if (loginType === 'google') {
      loginOptions = {
        connection: 'google-oauth2',
      };
    } else if (loginType === 'github') {
      loginOptions = {
        connection: 'github',
      };
    } else {
      throw new Error(
        `Invalid login type provided. Must be one of 'user-pass', 'facebook', 'google', or 'github'.`
      );
    }

    loginOptions = {
      ...loginOptions,
      scope: 'openid offline_access username nickname',
      // audience: 'https://exp.host',
      responseMode: 'form_post',
      responseType: 'token',
      device: 'xdl',
    };

    let auth0Options = {
      clientID: this.clientID,
    };

    if (loginType === 'user-pass') {
      try {
        const loginResp = await this._auth0LoginAsync(
          auth0Options,
          loginOptions
        );
        return await this._getProfileAsync({
          currentConnection: loginOptions.connection,
          accessToken: loginResp.access_token,
          refreshToken: loginResp.refresh_token,
          idToken: loginResp.id_token,
          refreshTokenClientId: this.clientID,
        });
      } catch (err) {
        throw err;
      }
    }

    // Doing a social login, so start a server
    const {
      server,
      callbackURL,
      getTokenInfoAsync,
    } = await _startLoginServerAsync();

    // Kill server after 5 minutes if it hasn't already been closed
    const destroyServerTimer = setTimeout(() => {
      if (server.listening) {
        server.destroy();
      }
    }, AUTHENTICATION_SERVER_TIMEOUT);

    auth0Options = {
      clientID: this.clientID,
      callbackURL,
    };

    // Don't await -- we'll get response back through server
    // This will open a browser window
    this._auth0LoginAsync(auth0Options, loginOptions);

    // Wait for token info to come back from server
    const tokenInfo = await getTokenInfoAsync();

    server.destroy();
    clearTimeout(destroyServerTimer);

    const profile = await this._getProfileAsync({
      currentConnection: loginOptions.connection,
      accessToken: tokenInfo.access_token,
      refreshToken: tokenInfo.refresh_token,
      idToken: tokenInfo.id_token,
      refreshTokenClientId: this.clientID,
    });

    return profile;
  }

  async registerAsync(
    userData: RegistrationData,
    user: ?UserOrLegacyUser
  ): Promise<User> {
    if (!user) {
      user = await this.getCurrentUserAsync();
    }

    if (
      user &&
      user.kind === 'user' &&
      user.userMetadata &&
      user.userMetadata.onboarded
    ) {
      await this.logoutAsync();
      user = null;
    }

    let shouldUpdateUsernamePassword = true;
    if (user && user.kind === 'legacyUser') {
      // we're upgrading from an older client,
      // so login with username/pass
      if (userData.username && userData.password) {
        user = await this.loginAsync('user-pass', {
          username: userData.username,
          password: userData.password,
        });
      }
      shouldUpdateUsernamePassword = false;
    }

    const currentUser: ?User = (user: any);

    const shouldLinkAccount =
      currentUser &&
      currentUser.currentConnection !== 'Username-Password-Authentication';

    try {
      // Create or update the profile
      let registeredUser = await this.createOrUpdateUserAsync({
        connection: 'Username-Password-Authentication', // Always create/update username password
        email: userData.email,
        userMetadata: {
          onboarded: true,
          givenName: userData.givenName,
          familyName: userData.familyName,
        },
        ...(shouldUpdateUsernamePassword
          ? { username: userData.username }
          : {}),
        ...(shouldLinkAccount ? { emailVerified: true } : {}),
        ...(shouldUpdateUsernamePassword
          ? { password: userData.password }
          : {}),
        ...(currentUser && shouldLinkAccount
          ? {
              forceCreate: true,
              linkedAccountId: currentUser.userId,
              linkedAccountConnection: currentUser.currentConnection,
            }
          : {}),
      });

      // if it's a new registration, or if they signed up with a social account,
      // we need to re-log them in with their username/pass. Otherwise, they're
      // already logged in.
      if (
        shouldLinkAccount ||
        (registeredUser &&
          (!registeredUser.loginsCount ||
            (registeredUser.loginsCount && registeredUser.loginsCount < 1)))
      ) {
        // this is a new registration, log them in
        registeredUser = await this.loginAsync('user-pass', {
          username: userData.username,
          password: userData.password,
        });
      }

      return registeredUser;
    } catch (e) {
      throw new XDLError(
        ErrorCode.REGISTRATION_ERROR,
        'Error registering user: ' + e.message
      );
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
      if (await this.getLegacyUserData()) {
        throw new XDLError(
          ErrorCode.LEGACY_ACCOUNT_ERROR,
          `We've updated our account system! Please login again by running \`exp login\`. Sorry for the inconvenience!`
        );
      }
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
      // If user is cached and token isn't expired
      // return the user
      if (
        this._currentUser &&
        !this._isTokenExpired(this._currentUser.idToken)
      ) {
        return this._currentUser;
      }

      if (Config.offline) {
        return null;
      }

      // Not cached, check for token
      let {
        currentConnection,
        idToken,
        accessToken,
        refreshToken,
      } = await UserSettings.getAsync('auth', {});

      // No tokens, no current user. Need to login
      if (!currentConnection || !idToken || !accessToken || !refreshToken) {
        return null;
      }

      try {
        return await this._getProfileAsync({
          currentConnection,
          accessToken,
          idToken,
          refreshToken,
        });
      } catch (e) {
        Logger.global.error(e);
        // This logs us out if theres a fatal error when getting the profile with
        // current access token
        // However, this also logs us out if there is a network error
        await this.logoutAsync();
        return null;
      }
    } finally {
      this._getSessionLock.release();
    }
  }

  /**
   * Get legacy user data from UserSettings.
   */
  async getLegacyUserData(): Promise<?LegacyUser> {
    const legacyUsername = await UserSettings.getAsync('username', null);
    if (legacyUsername) {
      return {
        kind: 'legacyUser',
        username: legacyUsername,
        userMetadata: {
          legacy: true,
          needsPasswordMigration: true,
        },
      };
    }
    return null;
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

      const {
        user: updatedUser,
      } = await api.postAsync('auth/createOrUpdateUser', {
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

    // Delete saved JWT
    await UserSettings.deleteKeyAsync('auth');
    // Delete legacy auth
    await UserSettings.deleteKeyAsync('username');

    // Logout of Intercom
    Intercom.update(null, null);
  }

  /**
   * Forgot Password
   */
  async forgotPasswordAsync(usernameOrEmail: string): Promise<void> {
    return await this._auth0ForgotPasswordAsync(usernameOrEmail);
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
    accessToken,
    idToken,
    refreshToken,
    refreshTokenClientId,
  }: {
    currentConnection: ConnectionType,
    accessToken: string,
    idToken: string,
    refreshToken: string,
    refreshTokenClientId?: string,
  }): Promise<User> {
    // Attempt to grab profile from Auth0.
    // If token is expired / getting the profile fails, use refresh token to
    let user;
    try {
      const dtoken = jwt.decode(idToken, { complete: true });
      const { aud } = dtoken.payload;

      // If it's not a new login, refreshTokenClientId won't be set in the arguments.
      // In this case, try to get the currentRefreshTokenClientId from UserSettings,
      // otherwise, default back to the audience of the current id_token
      if (!refreshTokenClientId) {
        const {
          refreshTokenClientId: currentRefreshTokenClientId,
        } = await UserSettings.getAsync('auth', {});
        if (!currentRefreshTokenClientId) {
          refreshTokenClientId = aud; // set it to the "aud" property of the existing token
        } else {
          refreshTokenClientId = currentRefreshTokenClientId;
        }
      }

      // TODO(@skevy): remove
      if (process.env.NODE_ENV !== 'production') {
        Logger.global.debug('REFRESH_TOKEN_CLIENT_ID', refreshTokenClientId);
      }
      // TODO(@skevy): remove
      if (process.env.NODE_ENV !== 'production') {
        Logger.global.debug('DECODED TOKEN', dtoken);
      }

      if (this._isTokenExpired(idToken)) {
        // if there's less than the refresh session threshold left on the token, refresh it
        // TODO(@skevy): remove
        if (process.env.NODE_ENV !== 'production') {
          Logger.global.debug('REFRESHING ID TOKEN');
        }
        // TODO(@skevy): remove
        if (process.env.NODE_ENV !== 'production') {
          Logger.global.debug('REFRESH TOKEN', refreshToken);
        }
        const delegationResult = await this._auth0RefreshToken(
          refreshTokenClientId, // client id that's associated with the refresh token
          refreshToken // refresh token to use
        );
        // TODO(@skevy): remove
        if (process.env.NODE_ENV !== 'production') {
          Logger.global.debug('SUCCESSFULLY GOT NEW ID TOKEN');
        }
        idToken = delegationResult.id_token;
        // TODO(@skevy): remove
        if (process.env.NODE_ENV !== 'production') {
          Logger.global.debug('NEW ID TOKEN', idToken);
        }
      }
      // TODO(@skevy): remove
      if (process.env.NODE_ENV !== 'production') {
        Logger.global.debug('ID TOKEN FOR PROFILE', idToken);
      }
      user = await this._auth0GetProfileAsync(idToken);
      // TODO(@skevy): remove
      if (process.env.NODE_ENV !== 'production') {
        Logger.global.debug('USER DATA', user);
      }
      if (!user) {
        throw new Error('No user profile associated with this token');
      }
    } catch (e) {
      throw e;
    }

    if (!user) {
      throw new Error('Unable to fetch user.');
    }

    user = {
      ..._parseAuth0Profile(user),
      kind: 'user',
      currentConnection,
      accessToken,
      idToken,
      refreshToken,
    };

    await UserSettings.mergeAsync({
      auth: {
        userId: user.userId,
        username: user.username,
        currentConnection,
        accessToken,
        idToken,
        refreshToken,
        ...(refreshTokenClientId ? { refreshTokenClientId } : {}),
      },
    });

    await UserSettings.deleteKeyAsync('username');

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
        Intercom.update(user.username, user.intercomUserHash);
      }
    } else {
      Intercom.update(null, null);
    }

    this._currentUser = user;

    return user;
  }

  _isTokenExpired(idToken: string): boolean {
    const dtoken = jwt.decode(idToken, { complete: true });
    const { exp } = dtoken.payload;
    // TODO(@skevy): remove
    if (process.env.NODE_ENV !== 'production') {
      Logger.global.debug('TOKEN EXPIRATION', exp);
    }
    // TODO(@skevy): remove
    if (process.env.NODE_ENV !== 'production') {
      Logger.global.debug('TOKEN TIME LEFT', exp - Date.now() / 1000);
    }

    return exp - Date.now() / 1000 <= this.refreshSessionThreshold;
  }

  async _auth0LoginAsync(
    auth0Options: Auth0Options,
    loginOptions: LoginOptions
  ): Promise<*> {
    if (typeof window !== 'undefined' && window) {
      const Auth0JS = _auth0JSInstanceWithOptions(auth0Options);
      const resp = await Auth0JS.loginAsync(loginOptions);
      return {
        access_token: resp.accessToken,
        id_token: resp.idToken,
        refresh_token: resp.refreshToken,
      };
    }

    const Auth0Node = _nodeAuth0InstanceWithOptions(auth0Options);

    if (loginOptions.connection === 'Username-Password-Authentication') {
      try {
        return await Auth0Node.oauth.signIn(loginOptions);
      } catch (e) {
        const err = _formatAuth0NodeError(e);
        if (err.message === 'invalid_user_password') {
          throw new XDLError(
            ErrorCode.INVALID_USERNAME_PASSWORD,
            'Invalid username or password'
          );
        } else {
          throw err;
        }
      }
    } else {
      // social
      opn(_buildAuth0SocialLoginUrl(auth0Options, loginOptions), {
        wait: false,
      });
      return {};
    }
  }

  async _auth0GetProfileAsync(idToken: string): Promise<*> {
    if (typeof window !== 'undefined' && window) {
      const Auth0JS = _auth0JSInstanceWithOptions({ clientID: this.clientID });
      return await Auth0JS.getProfileAsync(idToken);
    }

    const Auth0Node = _nodeAuth0InstanceWithOptions({
      clientID: this.clientID,
    });

    const profile = await Auth0Node.tokens.getInfo(idToken);
    return profile;
  }

  async _auth0RefreshToken(clientId: string, refreshToken: string): Promise<*> {
    const delegationTokenOptions = {
      refresh_token: refreshToken,
      api_type: 'app',
      scope: 'openid offline_access nickname username',
      target: this.clientID,
      client_id: clientId,
    };

    if (typeof window !== 'undefined' && window) {
      const Auth0JS = _auth0JSInstanceWithOptions({
        clientID: clientId,
      });

      return await Auth0JS.getDelegationTokenAsync({
        ...delegationTokenOptions,
      });
    }

    const Auth0Node = _nodeAuth0InstanceWithOptions({
      clientID: this.clientID,
    });

    const delegationResult = await Auth0Node.tokens.getDelegationToken({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      ...delegationTokenOptions,
    });

    return delegationResult;
  }

  async _auth0ForgotPasswordAsync(usernameOrEmail: string): Promise<void> {
    if (typeof window !== 'undefined' && window) {
      const Auth0JS = _auth0JSInstanceWithOptions({ clientID: this.clientID });
      return await Auth0JS.changePasswordAsync({
        connection: 'Username-Password-Authentication',
        email: usernameOrEmail,
      });
    }

    const Auth0Node = _nodeAuth0InstanceWithOptions({
      clientID: this.clientID,
    });

    return await Auth0Node.database.changePassword({
      connection: 'Username-Password-Authentication',
      email: usernameOrEmail,
    });
  }
}

let __globalInstance;
export default UserManagerInstance.getGlobalInstance();

/** Private Methods **/

type APIError = Error & {
  name: string,
  statusCode: string,
};

type ErrorWithDescription = Error & {
  description?: string,
};

function _formatAuth0NodeError(e: APIError) {
  // TODO: Fix the Auth0 js library to throw better error messages when the network fails.
  // Auth0 returns an error object whenver Auth0 fails to make an API request.
  // These error messages are usually well-formed when you have an invalid login or too many attempts,
  // but when the network is down it does not give any meaningful messages.
  // Network failures log the user out in _getCurrentUserAsync() when it uses Auth0.
  if (e.name !== 'APIError') {
    return e;
  } else {
    const errData = JSON.parse(e.message);
    const err: ErrorWithDescription = new Error(errData.error);
    err.description = errData.error_description;
    return err;
  }
}

function _buildAuth0SocialLoginUrl(
  auth0Options: Auth0Options,
  loginOptions: LoginOptions
) {
  const qsData = {
    scope: 'openid offline_access username nickname',
    response_type: loginOptions.responseType,
    response_mode: loginOptions.responseMode,
    connection: loginOptions.connection,
    device: 'xdl',
    client_id: auth0Options.clientID,
    redirect_uri: auth0Options.callbackURL,
  };

  const queryString = qs.stringify(qsData);

  return `https://${AUTH0_DOMAIN}/authorize?${queryString}`;
}

function _auth0JSInstanceWithOptions(options: Object = {}): any {
  const Auth0 = require('auth0-js');

  let auth0Options = {
    domain: AUTH0_DOMAIN,
    responseType: 'token',
    ...options,
  };

  const Auth0Instance = Bluebird.promisifyAll(new Auth0(auth0Options));

  return Auth0Instance;
}

function _nodeAuth0InstanceWithOptions(options: Object = {}): any {
  let auth0Options = {
    domain: AUTH0_DOMAIN,
    clientId: options.clientID || options.clientId,
    ...options,
  };

  let Auth0Instance;
  if (auth0Options.management === true) {
    auth0Options = _.omit(auth0Options, 'management');
    const ManagementClient = require('auth0').ManagementClient;
    Auth0Instance = new ManagementClient(auth0Options);
  } else {
    const AuthenticationClient = require('auth0').AuthenticationClient;
    Auth0Instance = new AuthenticationClient(auth0Options);
  }

  return Auth0Instance;
}

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

type TokenInfo = {
  access_token: string,
  id_token: string,
  refresh_token: string,
};

class Deferred<X> {
  promise: Promise<X>;
  resolve: (...args: Array<*>) => void;
  reject: (...args: Array<*>) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}

type ServerWithDestroy = {
  destroy: Function,
  listening: boolean,
  on: Function,
  close: Function,
  listen: Function,
};

async function _startLoginServerAsync(): Promise<{
  server: ServerWithDestroy,
  callbackURL: string,
  getTokenInfoAsync: () => Promise<TokenInfo>,
}> {
  let dfd = new Deferred();

  const server: ServerWithDestroy = ((http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/callback') {
      let body = '';
      req.on('data', function(data) {
        body += data;
      });
      req.on('end', function() {
        dfd.resolve(qs.parse(body));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          `
          <html>
          <head>
            <script>
              window.close();
            </script>
          </head>
          <body>
            Authenticated successfully! You can close this window.
          </body>
          </html>
        `
        );
      });
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        `
        <html>
        <head></head>
        <body></body>
        </html>
      `
      );
    }
  }): any): ServerWithDestroy);

  server.on('clientError', (err, socket) => {
    //eslint-disable-line
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  let connections = {};

  server.on('connection', function(conn) {
    let key = conn.remoteAddress + ':' + conn.remotePort;
    connections[key] = conn;
    conn.on('close', function() {
      delete connections[key];
    });
  });

  server.destroy = function(cb) {
    server.close(cb);
    for (let key in connections) {
      connections[key].destroy();
    }
  };

  const port = await freeportAsync(11000);
  try {
    server.listen(port, '127.0.0.1');

    return {
      server,
      callbackURL: `http://127.0.0.1:${port}/callback`,
      getTokenInfoAsync: (): Promise<TokenInfo> => dfd.promise,
    };
  } catch (err) {
    throw err;
  }
}
