import log from '../log';

import { Context, IView } from './context';
import { SelectPlatform, askQuit } from './views/Select';

let mainView: IView = new SelectPlatform();

export function changeMainView(view: IView) {
  mainView = view;
}

export async function runCredentialsManager(ctx: Context, startView: IView) {
  mainView = startView;
  let currentView = (await startView.open(ctx)) || (await askQuit(mainView));
  while (true) {
    try {
      currentView = (await currentView.open(ctx)) || (await askQuit(mainView));
    } catch (error) {
      log(error);
      await new Promise(res => setTimeout(res, 1000));
      currentView = await askQuit(mainView);
    }
  }
}
