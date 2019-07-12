import { IView, Context, CredentialsManagerOptions } from './context';
import { askQuit, Summary } from './views/Summary';
import log from '../log';

export { Context, CredentialsManagerOptions };

export async function runCredentialsManager(ctx: Context) {
  let currentView = ctx.mainView;
  currentView = (await currentView.open(ctx)) || (await askQuit(ctx.mainView));
  while (true) {
    try {
      currentView = (await currentView.open(ctx)) || (await askQuit(ctx.mainView));
    } catch (error) {
      log(error);
      await new Promise(res => setTimeout(res, 1000));
      currentView = await askQuit(ctx.mainView);
    }
  }
}

