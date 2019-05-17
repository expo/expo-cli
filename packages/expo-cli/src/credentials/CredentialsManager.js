/* @flow */

import { ApiV2, Exp, User, ProjectUtils } from 'xdl';
import log from '../log';
import { View } from './views/View';
import { Summary, askQuit } from './views/Summary';
import { Context } from './schema';

export class CredentialsManager extends Context {
  mainpage: View = new Summary();

  constructor(projectDir: string, options: Object) {
    super();
    this.projectDir = projectDir;
    this.options = options;
  }

  async init() {
    if (true /* TODO has project context */) {
      /* This manager does not need to work in project context */
      const { exp } = await ProjectUtils.readConfigJsonAsync(this.projectDir);
      this.manifest = exp;
      this.hasProjectContext = true;
    }

    this.user = await User.ensureLoggedInAsync();
    this.apiClient = ApiV2.clientForUser(this.user);
  }

  async cli() {
    let currentView = this.mainpage;
    currentView = (await currentView.open(this)) || (await askQuit(this.mainpage));
    while (true) {
      try {
        currentView = (await currentView.open(this)) || (await askQuit(this.mainpage));
      } catch (error) {
        log(error);
        await new Promise(res => setTimeout(res, 1000));
        currentView = await askQuit(this.mainpage);
      }
    }
  }
}
