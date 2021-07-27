import JsonFile from '@expo/json-file';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import uuid from 'uuid';

import { ConnectionType, Env } from './internal';

export type UserSettingsData = {
  developmentCodeSigningId?: string;
  appleId?: string;
  accessToken?: string;
  auth?: UserData | null;
  ignoreBundledBinaries?: string[];
  openDevToolsAtStartup?: boolean;
  PATH?: string;
  sendTo?: string;
  uuid?: string;
};

export type UserData = {
  developmentCodeSigningId?: string;
  appleId?: string;
  userId?: string;
  username?: string;
  currentConnection?: ConnectionType;
  sessionSecret?: string;
};

const SETTINGS_FILE_NAME = 'state.json';

function userSettingsFile(): string {
  return path.join(dotExpoHomeDirectory(), SETTINGS_FILE_NAME);
}

function userSettingsJsonFile(): JsonFile<UserSettingsData> {
  return new JsonFile<UserSettingsData>(userSettingsFile(), {
    jsonParseErrorDefault: {},
    cantReadFileDefault: {},
  });
}

let mkdirped = false;

function dotExpoHomeDirectory() {
  let dirPath = process.env.__UNSAFE_EXPO_HOME_DIRECTORY;
  if (!dirPath) {
    const home = process.env.XDG_CONFIG_HOME ? process.env.XDG_CONFIG_HOME : os.homedir();

    if (Env.isStaging()) {
      dirPath = path.join(home, '.expo-staging');
    } else if (Env.isLocal()) {
      dirPath = path.join(home, '.expo-local');
    } else {
      dirPath = path.join(home, '.expo');
    }
  }
  if (!mkdirped) {
    fs.mkdirpSync(dirPath);
    mkdirped = true;
  }
  return dirPath;
}

// returns an anonymous, unique identifier for a user on the current computer
async function getAnonymousIdentifierAsync(): Promise<string> {
  const settings = await userSettingsJsonFile();
  let id = await settings.getAsync('uuid', null);

  if (!id) {
    id = uuid.v4();
    await settings.setAsync('uuid', id);
  }

  return id;
}

function accessToken(): string | null {
  return process.env.EXPO_TOKEN || null;
}

const UserSettings = Object.assign(userSettingsJsonFile(), {
  dotExpoHomeDirectory,
  userSettingsFile,
  userSettingsJsonFile,
  accessToken,
  getAnonymousIdentifierAsync,
  SETTINGS_FILE_NAME,
});

export default UserSettings;
