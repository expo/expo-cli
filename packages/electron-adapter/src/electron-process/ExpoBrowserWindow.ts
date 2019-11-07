import { BrowserWindow } from 'electron';

import Environment from './Environment';
import * as Shortcuts from './shortcuts';
import withTouchBar from './withTouchBar';

export default class ExpoBrowserWindow extends BrowserWindow {
  constructor(options?: Electron.BrowserWindowConstructorOptions) {
    super(options);

    this.loadURL(Environment.URL);

    Shortcuts.addDevMenu(this);
    Shortcuts.addReload(this);

    this.once('ready-to-show', () => {
      this.show();
    });

    withTouchBar(this);

    if (Environment.__DEV__) {
      this.webContents.openDevTools();
    }

    // TODO: Bacon: Only in prod ??
    // in dev mode this will cause chrome to open every time the render-process is updated - very annoying
    // this.webContents.on('will-navigate', (event: Event, newURL: string) => {
    //   event.preventDefault();
    //   shell.openExternal(newURL);
    // });
  }

  showOrRestore(): boolean {
    if (!this.isVisible()) this.show();
    if (this.isMinimized()) this.restore();
    this.focus();

    return true;
  }
}
