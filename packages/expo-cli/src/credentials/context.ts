import { ExpoConfig, getConfig } from '@expo/config';
import { ApiV2, Doctor, User, UserManager } from '@expo/xdl';

import { AppleCtx, authenticate } from '../appleApi';
import { IosApi } from './api';
import log from '../log';

export interface IView {
  open(ctx: Context): Promise<IView | null>;
}

type AppleCtxOptions = {
  appleId?: string;
  appleIdPassword?: string;
};

type CtxOptions = {
  allowAnonymous?: boolean;
};

export class Context {
  _hasProjectContext: boolean = false;
  _user?: User;
  _manifest?: ExpoConfig;
  _apiClient?: ApiV2;
  _iosApiClient?: IosApi;
  _appleCtx?: AppleCtx;

  get user(): User {
    return this._user as User;
  }
  get hasProjectContext(): boolean {
    return this._hasProjectContext;
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

  async ensureAppleCtx(options: AppleCtxOptions = {}) {
    if (!this._appleCtx) {
      this._appleCtx = await authenticate(options);
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

    // Check if we are in project context by looking for a manifest
    const status = await Doctor.validateWithoutNetworkAsync(projectDir);
    if (status !== Doctor.FATAL) {
      const { exp } = getConfig(projectDir);
      this._manifest = exp;
      this._hasProjectContext = true;
      this._iosApiClient = new IosApi(this.user).withProjectContext(this);
      this.logOwnerAndProject();
    } else {
      /* This manager does not need to work in project context */
      this._iosApiClient = new IosApi(this.user);
    }

    this._apiClient = ApiV2.clientForUser(this.user);
  }
}
