import { ApiV2, Exp, User, UserManager, ProjectUtils } from '@expo/xdl';
import log from '../log';
import { Summary, askQuit } from './views/Summary';

export type CredentialsManagerOptions = {
  
}

export interface IView {
  open(ctx: Context): Promise<IView | null>
};


export class Context {
  mainView: IView;
  
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

  constructor(mainView: IView) {
    this.mainView = mainView;
  }


  async init(projectDir: string, options: CredentialsManagerOptions) {
    if (true /* TODO has project context */) {
      /* This manager does not need to work in project context */
      const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
      this._manifest = exp;
      this._hasProjectContext = true;
    }

    this._user = await UserManager.ensureLoggedInAsync();
    this._apiClient = ApiV2.clientForUser(this.user);
  }
}




