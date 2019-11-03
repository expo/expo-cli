import { app, ipcMain } from 'electron';

import ExpoBrowserWindow from './ExpoBrowserWindow';

let browserWindow: ExpoBrowserWindow | null;

function createWindow(): void {
  /**
   * Create a new browser window that uses the Expo serving URL
   */
  browserWindow = new ExpoBrowserWindow({
    width: 800,
    minWidth: 700,
    height: 620,
    minHeight: 500,
    center: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  browserWindow.on('closed', () => {
    browserWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.on('show-main-window', () => {
  restoreMainWindow();
});

app.on('activate', () => {
  restoreMainWindow();
});

function restoreMainWindow() {
  if (browserWindow === null) {
    createWindow();
  } else {
    browserWindow.showOrRestore();
  }
}
