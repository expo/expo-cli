import log from '../log';

import { Context, IView } from './context';
import { IQuit, QuitError, askQuit, doQuit } from './views/Select';

export async function runCredentialsManagerStandalone(ctx: Context, startView: IView) {
  const manager = new CredentialsManager(ctx, startView, askQuit);
  await manager.run();
}

export async function runCredentialsManager(ctx: Context, startView: IView): Promise<null> {
  const manager = new CredentialsManager(ctx, startView, doQuit);
  return await manager.run();
}

export class CredentialsManager {
  static _manager?: CredentialsManager;
  _ctx: Context;
  _mainView: IView;
  _currentView: IView;
  _quit: IQuit;

  constructor(ctx: Context, startView: IView, quit: IQuit) {
    CredentialsManager._manager = this;
    this._ctx = ctx;
    this._mainView = startView;
    this._currentView = startView;
    this._quit = quit;
  }

  static get(): CredentialsManager {
    if (!CredentialsManager._manager) {
      throw new Error('Credential Manager has not been initialized yet');
    }
    return CredentialsManager._manager;
  }

  async run(): Promise<null> {
    while (true) {
      try {
        this._currentView =
          (await this._currentView.open(this._ctx)) || (await this._quit(this._mainView));
      } catch (error) {
        if (error instanceof QuitError) {
          return null;
        } else {
          log(error);
          await new Promise(res => setTimeout(res, 1000));
          this._currentView = await this._quit(this._mainView);
        }
      }
    }
  }

  changeMainView(view: IView) {
    this._mainView = view;
  }
}
