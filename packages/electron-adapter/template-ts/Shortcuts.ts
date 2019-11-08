import { globalShortcut, remote } from 'electron';

export function addReload(
  browserWindow: Electron.BrowserWindow,
  keyBindings: string[] = ['F5', 'CommandOrControl+R']
) {
  register(browserWindow, keyBindings, () => {
    if (remote && remote.getCurrentWindow()) {
      remote.getCurrentWindow().reload();
    } else if (browserWindow) {
      browserWindow.reload();
    }
  });
}

export function addDevMenu(
  browserWindow: Electron.BrowserWindow,
  keyBindings: string[] = ['CommandOrControl+J']
): void {
  register(browserWindow, keyBindings, () => {
    if (browserWindow) {
      if (browserWindow.webContents.isDevToolsOpened()) {
        browserWindow.webContents.closeDevTools();
      } else {
        browserWindow.webContents.openDevTools();
      }
    }
  });
}

export function register(
  browserWindow: Electron.BrowserWindow,
  keyBindings: string[],
  callback: Function
): void {
  for (const keyBinding of keyBindings) {
    globalShortcut.register(keyBinding, callback);
  }

  unregister(browserWindow, keyBindings);
}

export function unregister(browserWindow: Electron.BrowserWindow, keyBindings: string[]): void {
  // @ts-ignore
  browserWindow.addListener('beforeunload', () => {
    for (const keyBinding of keyBindings) {
      globalShortcut.unregister(keyBinding);
    }
  });
}
