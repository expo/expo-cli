import { globalShortcut, remote } from 'electron';

export function addReload(browserWindow, keyBindings = ['F5', 'CommandOrControl+R']) {
  register(browserWindow, keyBindings, () => {
    if (remote && remote.getCurrentWindow()) {
      remote.getCurrentWindow().reload();
    } else if (browserWindow) {
      browserWindow.reload();
    }
  });
}

export function addDevMenu(browserWindow, keyBindings = ['CommandOrControl+J']) {
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

export function register(browserWindow, keyBindings, callback) {
  for (const keyBinding of keyBindings) {
    globalShortcut.register(keyBinding, callback);
  }

  unregister(browserWindow, keyBindings);
}

export function unregister(browserWindow, keyBindings) {
  // @ts-ignore
  browserWindow.addListener('beforeunload', () => {
    for (const keyBinding of keyBindings) {
      globalShortcut.unregister(keyBinding);
    }
  });
}
