import fs from 'fs-extra';
import path from 'path';
import { ApiV2, Exp, User, UserManager, ProjectUtils, Doctor } from '@expo/xdl';
import log from '../log';

export interface IView {
  open(ctx: Context): Promise<IView | null>
};

export class Context {
  _hasProjectContext: boolean = false; 
  _user?: User;
  _manifest: any;
  _apiClient?: ApiV2;

  get user(): User {
    return this._user as User;
  }
  get hasProjectContext(): boolean {
    return this._hasProjectContext;
  }
  get manifest(): any {
    return this._manifest;
  }
  get api(): ApiV2 {
    return this._apiClient as ApiV2;
  }

  async init(projectDir: string) {
    const status = await Doctor.validateLowLatencyAsync(projectDir);
    if (status !== Doctor.FATAL) {
      /* This manager does not need to work in project context */
      const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
      this._manifest = exp;
      this._hasProjectContext = true;
    }

    this._user = await UserManager.ensureLoggedInAsync();
    this._apiClient = ApiV2.clientForUser(this.user);
  }
}




