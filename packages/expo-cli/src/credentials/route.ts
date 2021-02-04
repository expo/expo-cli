import { sleep } from '../commands/utils/promise';
import Log from '../log';
import { Context, IView } from './context';
import { AskQuit, DoQuit, IQuit, QuitError } from './views/Select';

export async function runCredentialsManagerStandalone(ctx: Context, startView: IView) {
  const manager = new CredentialsManager(ctx, startView, new AskQuit());
  await manager.run();
}

export async function runCredentialsManager(ctx: Context, startView: IView): Promise<null> {
  const manager = new CredentialsManager(ctx, startView, new DoQuit());
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
          (await this._currentView.open(this._ctx)) || (await this._quit.runAsync(this._mainView));
      } catch (error) {
        // View quit normally, exit normally
        if (error instanceof QuitError) {
          return null;
        }

        // View encountered error
        if (this._quit instanceof DoQuit) {
          // propagate error up
          throw error;
        } else {
          // fallback to interactive Quit View
          Log.log(error);
          await sleep(1000);
          this._currentView = await this._quit.runAsync(this._mainView);
        }
      }
    }
  }

  changeMainView(view: IView) {
    this._mainView = view;
  }
}
