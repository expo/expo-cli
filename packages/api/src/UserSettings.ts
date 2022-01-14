import JsonFile from '@expo/json-file';
import fs from 'fs';
import { homedir } from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import Env from './Env';
import { UserData } from './User';

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

const SETTINGS_FILE_NAME = 'state.json';

function userSettingsFile(): string {
  return path.join(getDirectory(), SETTINGS_FILE_NAME);
}

function userSettingsJsonFile(): JsonFile<UserSettingsData> {
  return new JsonFile<UserSettingsData>(userSettingsFile(), {
    jsonParseErrorDefault: {},
    cantReadFileDefault: {},
  });
}

// TODO: Consolidate the expo/config copy of this function.
function getExpoHomeDirectory() {
  const home = homedir();

  if (Env.__UNSAFE_EXPO_HOME_DIRECTORY) {
    return Env.__UNSAFE_EXPO_HOME_DIRECTORY;
  } else if (Env.EXPO_STAGING) {
    return path.join(home, '.expo-staging');
  } else if (Env.EXPO_LOCAL) {
    return path.join(home, '.expo-local');
  }
  return path.join(home, '.expo');
}

let ensureDirectoryCreated = false;

/** Return the user cache directory. */
function getDirectory() {
  const dir = getExpoHomeDirectory();
  if (!ensureDirectoryCreated) {
    fs.mkdirSync(dir, { recursive: true });
    ensureDirectoryCreated = true;
  }
  return dir;
}

// returns an anonymous, unique identifier for a user on the current computer
async function getAnonymousIdentifierAsync(): Promise<string> {
  const settings = await userSettingsJsonFile();
  let id = await settings.getAsync('uuid', null);

  if (!id) {
    id = uuidv4();
    await settings.setAsync('uuid', id);
  }

  return id;
}

function accessToken(): string | null {
  return Env.EXPO_TOKEN;
}

const UserSettings = Object.assign(userSettingsJsonFile(), {
  getDirectory,
  userSettingsFile,
  userSettingsJsonFile,
  accessToken,
  getAnonymousIdentifierAsync,
  SETTINGS_FILE_NAME,
});

export default UserSettings;
