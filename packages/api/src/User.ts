import type { ExpoConfig } from '@expo/config-types';
import type { JSONObject } from '@expo/json-file';
import assert from 'assert';
import FormData from 'form-data';
import os from 'os';

import Analytics from './Analytics';
import ApiV2Client from './ApiV2';
import Config from './Config';
import { Semaphore } from './Semaphore';
import UnifiedAnalytics from './UnifiedAnalytics';
import UserSettings from './UserSettings';
import { AuthError } from './utils/errors';

export type DetailOptions = {
  publishId?: string;
  raw?: boolean;
};

export type UserData = {
  developmentCodeSigningId?: string;
  appleId?: string;
  userId?: string;
  username?: string;
  currentConnection?: ConnectionType;
  sessionSecret?: string;
};

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

export type RobotUser = {
  kind: 'robot';
  // required
  userId: string;
  username: string; // backwards compatible to show in current UI -- based on given name or placeholder
  // optional
  givenName?: string;
  // auth methods
  currentConnection: ConnectionType;
  sessionSecret?: never; // robot users only use accessToken -- this prevents some extraneous typecasting
  accessToken?: string;
};

type LegacyUser = {
  kind: 'legacyUser';
  username: string;
  userMetadata: {
    legacy: boolean;
    needsPasswordMigration: boolean;
  };
};

type UserOrLegacyUser = User | LegacyUser;

export type ConnectionType =
  | 'Access-Token-Authentication'
  | 'Username-Password-Authentication'
  | 'facebook'
  | 'google-oauth2'
  | 'github';

type RegistrationData = {
  username: string;
  password: string;
  email?: string;
  givenName?: string;
  familyName?: string;
};

// note: user-token isn't listed here because it's a non-persistent pre-authenticated method
export type LoginType = 'user-pass' | 'facebook' | 'google' | 'github';

export const ANONYMOUS_USERNAME = 'anonymous';

export type S3AssetMetadata =
  | {
      exists: true;
      lastModified: Date;
      contentLength: number;
      contentType: string;
    }
  | {
      exists: false;
    };

export type HistoryOptions = {
  releaseChannel?: string;
  count?: number;
  platform?: 'android' | 'ios';
  raw?: boolean;
  sdkVersion?: string;
  runtimeVersion?: string;
};

export type SetOptions = { releaseChannel: string; publishId: string };

export type PublicationDetail = {
  manifest?: {
    [key: string]: string;
  };
  publishedTime: string;
  publishingUsername: string;
  packageUsername: string;
  packageName: string;
  fullName: string;
  hash: string;
  sdkVersion: string;
  runtimeVersion?: string;
  s3Key: string;
  s3Url: string;
  abiVersion: string | null;
  bundleUrl: string | null;
  platform: string;
  version: string;
  revisionId: string;
  channels: { [key: string]: string }[];
  publicationId: string;
};

export type Publication = {
  /** Like `@bacon/test-experience` */
  fullName: string;
  channel: string;
  channelId: string;
  publicationId: string;
  appVersion: string;
  /** Like `22.0.0` */
  sdkVersion: string;
  runtimeVersion?: string;
  publishedTime: string;
  platform: 'android' | 'ios';
};

export interface NativeModule {
  npmPackage: string;
  versionRange: string;
}
export type BundledNativeModuleList = NativeModule[];

export class UserManagerInstance {
  _currentUser: User | RobotUser | null = null;
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
   * Get the account and project name using a user and Expo config.
   * This will validate if the owner field is set when using a robot account.
   */
  getProjectOwner(user: User | RobotUser, exp: Pick<ExpoConfig, 'owner'>): string {
    if (user.kind === 'robot' && !exp.owner) {
      throw new AuthError(
        'ROBOT_OWNER_ERROR',
        'The "owner" manifest property is required when using robot users. See: https://docs.expo.dev/versions/latest/config/app/#owner'
      );
    }

    return exp.owner || user.username;
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
    loginArgs?: { username: string; password: string; otp?: string }
  ): Promise<User> {
    assert(loginType === 'user-pass', `Invalid login type provided. Must be 'user-pass'.`);
    assert(loginArgs, `The 'user-pass' login type requires a username and password.`);
    const { error, sessionSecret, error_description } = await ApiV2Client.clientForUser().postAsync(
      'auth/loginAsync',
      {
        username: loginArgs.username,
        password: loginArgs.password,
        otp: loginArgs.otp,
      }
    );
    if (error) {
      throw new AuthError('INVALID_USERNAME_PASSWORD', error_description);
    }
    const user = await this._getProfileAsync({
      currentConnection: 'Username-Password-Authentication',
      sessionSecret,
    });
    return user as User;
  }

  async registerAsync(
    userData: RegistrationData,
    user: UserOrLegacyUser | null = null
  ): Promise<User> {
    let actor: UserOrLegacyUser | RobotUser | null = user;

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
  async ensureLoggedInAsync(): Promise<User | RobotUser> {
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

  setInteractiveAuthenticationCallback(callback: () => Promise<User>) {
    this._interactiveAuthenticationCallbackAsync = callback;
  }

  async _readUserData(): Promise<UserData | null> {
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
  getCachedUserDataAsync = async (): Promise<UserData | null> => {
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
  async getCurrentUserAsync(options?: { silent?: boolean }): Promise<User | RobotUser | null> {
    await this._getSessionLock.acquire();

    try {
      const currentUser = this._currentUser;

      // If user is cached and there is an accessToken or sessionSecret, return the user
      if (currentUser && (currentUser.accessToken || currentUser.sessionSecret)) {
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
  async getCurrentUserOnlyAsync(): Promise<User | null> {
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
  async getCurrentRobotUserOnlyAsync(): Promise<RobotUser | null> {
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
  async createOrUpdateUserAsync(userData: object): Promise<User | null> {
    let currentUser = this._currentUser;
    if (!currentUser) {
      // attempt to get the current user
      currentUser = await this.getCurrentUserAsync();
    }

    if (currentUser?.kind === 'robot') {
      throw new AuthError('ROBOT_ACCOUNT_ERROR', 'This action is not available for robot users');
    }

    const { user: updatedUser } = await ApiV2Client.clientForUser(currentUser).postAsync(
      'auth/createOrUpdateUser',
      {
        userData: _prepareAuth0Profile(userData),
      }
    );

    this._currentUser = {
      ...this._currentUser,
      ..._parseAuth0Profile(updatedUser),
      kind: 'user',
    } as User;

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
   * Forgot Password
   */
  async forgotPasswordAsync(usernameOrEmail: string): Promise<void> {
    return ApiV2Client.clientForUser().postAsync('auth/forgotPasswordAsync', {
      usernameOrEmail,
    });
  }

  /** Send project URL to the user. */
  public async sendProjectAsync(
    user: User | RobotUser,
    emailOrPhone: string,
    url: string,
    includeExpoLinks: boolean = true
  ) {
    return await ApiV2Client.clientForUser(user).postAsync('send-project', {
      emailOrPhone,
      url,
      includeExpoLinks,
    });
  }

  public async getProjectAsync(user: User | RobotUser, projectId: string): Promise<JSONObject> {
    return await ApiV2Client.clientForUser(user).getAsync(
      `projects/${encodeURIComponent(projectId)}`
    );
  }

  public async signManifestAsync(user: User | RobotUser, manifest: JSONObject): Promise<string> {
    const { signature } = await ApiV2Client.clientForUser(user).postAsync('manifest/eas/sign', {
      manifest,
    });
    return signature;
  }

  public async signLegacyManifestAsync(
    user: User | RobotUser,
    manifest: JSONObject
  ): Promise<string> {
    const { response } = await ApiV2Client.clientForUser(user).postAsync('manifest/sign', {
      args: {
        remoteUsername: manifest.owner ?? (await this.getCurrentUsernameAsync()),
        remotePackageName: manifest.slug,
      },
      manifest: manifest as JSONObject,
    });
    return response;
  }

  public async uploadArtifactsAsync(
    user: User | RobotUser,
    {
      exp,
      iosBundle,
      androidBundle,
      options,
      pkg,
    }: {
      exp: ExpoConfig;
      iosBundle: string | Uint8Array;
      androidBundle: string | Uint8Array;
      options: JSONObject;
      pkg: JSONObject;
    }
  ): Promise<{
    /**
     * Project manifest URL
     */
    url: string;
    /**
     * Project page URL
     */
    projectPageUrl?: string;
    /**
     * TODO: What is this?
     */
    ids: string[];
    /**
     * TODO: What is this? Where does it come from?
     */
    err?: string;
  }> {
    const formData = new FormData();

    formData.append('expJson', JSON.stringify(exp));
    formData.append('packageJson', JSON.stringify(pkg));
    formData.append('iosBundle', iosBundle, 'iosBundle');
    formData.append('androidBundle', androidBundle, 'androidBundle');
    formData.append('options', JSON.stringify(options));

    return await ApiV2Client.clientForUser(user).uploadFormDataAsync('publish/new', formData);
  }

  public async getAssetsMetadataAsync(
    user: User | RobotUser,
    { keys }: { keys: string[] }
  ): Promise<Record<string, S3AssetMetadata>> {
    const { metadata } = await ApiV2Client.clientForUser(user).postAsync('assets/metadata', {
      keys,
    });
    return metadata;
  }

  public async uploadAssetsAsync(
    user: User | RobotUser,
    { data }: { data: FormData }
  ): Promise<unknown> {
    return await ApiV2Client.clientForUser(user).uploadFormDataAsync('assets/upload', data);
  }

  public async notifyAliveAsync(
    user: User | RobotUser,
    {
      exp,
      platform,
      url,
      description,
      source,
      openedAt,
    }: {
      openedAt?: number;
      description?: string;
      exp: ExpoConfig;
      platform: 'native' | 'web';
      url: string;
      source: 'desktop' | 'snack';
    }
  ): Promise<unknown> {
    return await ApiV2Client.clientForUser(user).postAsync('development-sessions/notify-alive', {
      data: {
        session: {
          description: description ?? `${exp.name} on ${os.hostname()}`,
          url,
          source,
          openedAt,
          // not on type
          hostname: os.hostname(),
          platform,
          config: {
            // TODO: if icons are specified, upload a url for them too so people can distinguish
            description: exp.description,
            name: exp.name,
            slug: exp.slug,
            primaryColor: exp.primaryColor,
          },
        },
      },
    });
  }

  /**
   * @param user
   * @param props.secondFactorDeviceID UUID of the second factor device
   */
  public async sendSmsOtpAsync(
    user: User | RobotUser | null,
    {
      username,
      password,
      secondFactorDeviceID,
    }: {
      username: string;
      password: string;
      secondFactorDeviceID: string;
    }
  ): Promise<unknown> {
    return await ApiV2Client.clientForUser(user).postAsync('auth/send-sms-otp', {
      username,
      password,
      secondFactorDeviceID,
    });
  }

  public async getLegacyReusableBuildAsync(
    user: User | RobotUser | null,
    {
      releaseChannel,
      platform,
      sdkVersion,
      slug,
      owner,
    }: {
      releaseChannel: string;
      platform: string;
      sdkVersion: string;
      slug: string;
      owner?: string;
    }
  ): Promise<{ downloadUrl?: string; canReuse: boolean }> {
    return await ApiV2Client.clientForUser(user).postAsync('standalone-build/reuse', {
      releaseChannel,
      platform,
      sdkVersion,
      slug,
      owner,
    });
  }

  public async getPublishHistoryAsync(
    user: User | RobotUser,
    {
      exp,
      options,
      version,
      owner,
    }: {
      exp: Pick<ExpoConfig, 'slug' | 'owner'>;
      options: HistoryOptions;
      version?: 2;
      owner?: string;
    }
  ): Promise<Publication[]> {
    if (options.count && (isNaN(options.count) || options.count < 1 || options.count > 100)) {
      throw new Error('-n must be a number between 1 and 100 inclusive');
    }

    const results = await ApiV2Client.clientForUser(user).postAsync('publish/history', {
      owner: owner ?? this.getProjectOwner(user, exp),
      slug: exp.slug,
      version,
      releaseChannel: options.releaseChannel,
      count: options.count,
      platform: options.platform,
      sdkVersion: options.sdkVersion,
      runtimeVersion: options.runtimeVersion,
    });

    return results.queryResult;
  }

  public async setPublishToChannelAsync(
    user: User | RobotUser,
    {
      exp,
      options,
    }: {
      exp: Pick<ExpoConfig, 'slug'>;
      options: SetOptions;
    }
  ): Promise<Publication> {
    const { queryResult } = await ApiV2Client.clientForUser(user).postAsync('publish/set', {
      releaseChannel: options.releaseChannel,
      publishId: options.publishId,
      slug: exp.slug,
    });
    return queryResult;
  }

  public async getPublicationDetailAsync(
    user: User | RobotUser,
    {
      exp,
      options,
    }: {
      exp: Pick<ExpoConfig, 'slug' | 'owner'>;
      options: DetailOptions;
    }
  ): Promise<PublicationDetail> {
    const result = await ApiV2Client.clientForUser(user).postAsync('publish/details', {
      owner: this.getProjectOwner(user, exp),
      publishId: options.publishId,
      slug: exp.slug,
    });

    assert(result.queryResult, 'No records found matching your query.');

    return result.queryResult;
  }

  /**
   * The endpoint returns the list of bundled native modules for a given SDK version.
   * The data is populated by the `et sync-bundled-native-modules` script from expo/expo repo.
   * See the code for more details:
   * https://github.com/expo/expo/blob/master/tools/src/commands/SyncBundledNativeModules.ts
   *
   * Example result:
   * [
   *   {
   *     id: "79285187-e5c4-47f7-b6a9-664f5d16f0db",
   *     sdkVersion: "41.0.0",
   *     npmPackage: "expo-analytics-amplitude",
   *     versionRange: "~10.1.0",
   *     createdAt: "2021-04-29T09:34:32.825Z",
   *     updatedAt: "2021-04-29T09:34:32.825Z"
   *   },
   *   ...
   * ]
   */
  public async getBundledNativeModulesFromApiAsync(
    user: User | RobotUser | null,
    sdkVersion: string
  ): Promise<Record<string, string>> {
    const list = (await ApiV2Client.clientForUser(user).getAsync(
      `sdks/${sdkVersion}/native-modules`
    )) as BundledNativeModuleList;
    if (list.length === 0) {
      throw new Error('The bundled native module list from www is empty');
    }

    return list.reduce((acc, i) => {
      acc[i.npmPackage] = i.versionRange;
      return acc;
    }, {} as Record<string, string>);
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
  }): Promise<User | RobotUser> {
    let user = await ApiV2Client.clientForUser({
      sessionSecret,
      accessToken,
    }).getAsync('auth/userInfo');

    if (!user) {
      throw new Error('Unable to fetch user.');
    }

    user = {
      ..._parseAuth0Profile(user),
      // We need to inherit the "robot" type only, the rest is considered "user" but returned as "person".
      kind: user.user_type === 'robot' ? 'robot' : 'user',
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
export default UserManagerInstance.getGlobalInstance();

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
