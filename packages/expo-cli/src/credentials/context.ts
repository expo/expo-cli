import { ExpoConfig, getConfig } from '@expo/config';
import { ApiV2, RobotUser, User, UserManager } from 'xdl';

import { AppleCtx, authenticateAsync } from '../appleApi';
import Log from '../log';
import AndroidApi from './api/AndroidApi';
import IosApi from './api/IosApi';

export interface IView {
  open(ctx: Context): Promise<IView | null>;
}

interface AppleCtxOptions {
  appleId?: string;
  appleIdPassword?: string;
  teamId?: string;
}

interface CtxOptions extends AppleCtxOptions {
  allowAnonymous?: boolean;
  nonInteractive?: boolean;
}

export class Context {
  _hasProjectContext: boolean = false;
  _projectDir?: string;
  _user?: User | RobotUser;
  _manifest?: ExpoConfig;
  _apiClient?: ApiV2;
  _iosApiClient?: IosApi;
  _androidApiClient?: AndroidApi;
  _appleCtxOptions?: AppleCtxOptions;
  _appleCtx?: AppleCtx;
  _nonInteractive?: boolean;

  get nonInteractive(): boolean {
    return this._nonInteractive === true;
  }

  get user(): User | RobotUser {
    return this._user as User | RobotUser;
  }
  get hasProjectContext(): boolean {
    return this._hasProjectContext;
  }
  get projectDir(): string {
    return this._projectDir as string;
  }
  get projectOwner(): string {
    return UserManager.getProjectOwner(this.user, this.manifest);
  }
  get manifest(): ExpoConfig {
    if (!this._manifest) {
      throw new Error('Manifest (app.json) not initialized.');
    }
    return this._manifest;
  }
  get api(): ApiV2 {
    return this._apiClient as ApiV2;
  }
  get android(): AndroidApi {
    return this._androidApiClient as AndroidApi;
  }
  get ios(): IosApi {
    return this._iosApiClient as IosApi;
  }
  get appleCtx(): AppleCtx {
    if (!this._appleCtx) {
      throw new Error('Apple context not initialized.');
    }
    return this._appleCtx;
  }
  set manifest(value: ExpoConfig) {
    this._manifest = value;
  }

  hasAppleCtx(): boolean {
    return !!this._appleCtx;
  }

  async ensureAppleCtx() {
    if (!this._appleCtx) {
      this._appleCtx = await authenticateAsync(this._appleCtxOptions);
    }
  }

  logOwnerAndProject() {
    // Figure out if User A is configuring credentials as admin for User B's project
    const isProxyUser = this.manifest.owner && this.manifest.owner !== this.user.username;
    Log.log(
      `Accessing credentials ${isProxyUser ? 'on behalf of' : 'for'} ${
        this.projectOwner
      } in project ${this.manifest.slug}`
    );
  }

  async init(projectDir: string, options: CtxOptions = {}) {
    const { allowAnonymous, appleId, appleIdPassword, teamId, nonInteractive } = options;
    this._user = (await UserManager.getCurrentUserAsync()) || undefined;

    // User isn't signed it, but needs to be signed in
    if (!this._user && !allowAnonymous) {
      this._user = (await UserManager.ensureLoggedInAsync()) as User;
    }

    this._projectDir = projectDir;
    this._apiClient = ApiV2.clientForUser(this.user);
    this._iosApiClient = new IosApi(this.api);
    this._androidApiClient = new AndroidApi(this.api);
    this._appleCtxOptions = { appleId, appleIdPassword, teamId };
    this._nonInteractive = nonInteractive;

    // try to access project context
    try {
      const { exp } = getConfig(projectDir, { skipSDKVersionRequirement: true });
      this._manifest = exp;
      this._hasProjectContext = true;
      this.logOwnerAndProject();
    } catch (error: any) {
      // ignore error
      // startcredentials manager without project context
    }
  }
}
