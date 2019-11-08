import { app, remote } from 'electron';
import * as path from 'path';

const _app = app || remote.app;

const isEnvSet = 'ELECTRON_IS_DEV' in process.env;
const getFromEnv = !!process.env.ELECTRON_IS_DEV && parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;

const __DEV__ = isEnvSet ? getFromEnv : !_app.isPackaged;

export default {
  __DEV__,
  get devURL() {
    if (!process.env.EXPO_ELECTRON_URL || typeof process.env.EXPO_ELECTRON_URL !== 'string') {
      // This can happen if you start electron manually without defining the environment.
      throw new Error(
        'expo/electron-adapter: process.env.EXPO_ELECTRON_URL should be set to the URL where your project is hosted'
      );
    }
    return process.env.EXPO_ELECTRON_URL;
  },
  get prodURL() {
    return path.join(`file://${path.join(__dirname, 'web/index.html')}`);
  },
  get URL() {
    return this.__DEV__ ? this.devURL : this.prodURL;
  },
};
