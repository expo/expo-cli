/**
 * Electron app.js for inspector
 */

import { app, BrowserWindow } from 'electron';
import process from 'process';

app.whenReady().then(() => {
  const argv = process.argv.slice(2);
  const url = argv[0];
  if (!url) {
    app.quit();
    return;
  }

  const window = new BrowserWindow({
    width: 800,
    height: 600,
  });
  window.loadURL(url);
});

app.on('window-all-closed', function () {
  app.quit();
});
