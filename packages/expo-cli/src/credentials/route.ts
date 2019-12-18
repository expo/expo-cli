import log from '../log';

import { Context, IView } from './context';
import { askQuit, doQuit, QuitError, IQuit } from './views/Select';

export async function runCredentialsManagerStandalone(ctx: Context, startView: IView) {
  const manager = new CredentialsManager(ctx, startView, askQuit);
  await manager.run();
}

export async function runCredentialsManager(ctx: Context, startView: IView): Promise<null> {
  const manager = new CredentialsManager(ctx, startView, doQuit);
  return await manager.run();
}

export class GoBackError extends Error {
  constructor() {
    super();

    // Set the prototype explicitly.
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, GoBackError.prototype);
  }
}

export class CredentialsManager {
  static _manager?: CredentialsManager;
  _viewHistory: IView[] = [];
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
        const previousView = this._currentView;
        this._currentView =
          (await this._currentView.open(this._ctx)) || (await this._quit(this._mainView));
        this.addToHistory(previousView);
      } catch (error) {
        if (error instanceof QuitError) {
          return null;
        } else if (error instanceof GoBackError) {
          this._currentView = this.popFromHistory() || (await this._quit(this._mainView));
          continue;
        }
        log(error);
        await new Promise(res => setTimeout(res, 1000));
        this._currentView = await this._quit(this._mainView);
      }
    }
  }

  addToHistory(view: IView) {
    this._viewHistory.push(view);
  }

  popFromHistory(): IView | null {
    return this._viewHistory.pop() || null;
  }

  async doInteractiveOperation<T>(operation: () => Promise<T>, currentView: IView): Promise<T> {
    this.addToHistory(currentView);
    const result = await operation();
    this.popFromHistory();
    return result;
  }

  changeMainView(view: IView) {
    this._mainView = view;
  }
}
