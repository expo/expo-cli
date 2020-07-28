import { ExpoConfig, getConfig } from '@expo/config';
import { ApiV2, Doctor, User, UserManager } from '@expo/xdl';
import pick from 'lodash/pick';

import { AppleCtx, authenticate } from '../appleApi';
import log from '../log';
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
  _user?: User;
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

  get user(): User {
    return this._user as User;
  }
  get hasProjectContext(): boolean {
    return this._hasProjectContext;
  }
  get projectDir(): string {
    return this._projectDir as string;
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
      this._appleCtx = await authenticate(this._appleCtxOptions);
    }
  }

  logOwnerAndProject() {
    // Figure out if User A is configuring credentials as admin for User B's project
    const isProxyUser = this.manifest.owner && this.manifest.owner !== this.user.username;
    log(
      `Configuring credentials ${isProxyUser ? 'on behalf of' : 'for'} ${
        this.manifest.owner ?? this.user.username
      } in project ${this.manifest.slug}`
    );
  }

  async init(projectDir: string, options: CtxOptions = {}) {
    if (options.allowAnonymous) {
      this._user = (await UserManager.getCurrentUserAsync()) || undefined;
    } else {
      this._user = await UserManager.ensureLoggedInAsync();
    }
    this._projectDir = projectDir;
    this._apiClient = ApiV2.clientForUser(this.user);
    this._iosApiClient = new IosApi(this.api);
    this._androidApiClient = new AndroidApi(this.api);
    this._appleCtxOptions = pick(options, ['appleId', 'appleIdPassword', 'teamId']);
    this._nonInteractive = options.nonInteractive;

    // Check if we are in project context by looking for a manifest
    const status = await Doctor.validateWithoutNetworkAsync(projectDir);
    if (status !== Doctor.FATAL) {
      const { exp } = getConfig(projectDir);
      this._manifest = exp;
      this._hasProjectContext = true;
      this.logOwnerAndProject();
    }
  }
}
