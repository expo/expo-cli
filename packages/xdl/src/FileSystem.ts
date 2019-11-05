import * as osascript from '@expo/osascript';
import spawnAsync from '@expo/spawn-async';
import { execSync } from 'child_process';

import XDLError from './XDLError';

export function openFolderName() {
  if (process.platform === 'darwin') {
    return 'Show in Finder';
  } else if (process.platform === 'win32') {
    return 'Show in File Explorer';
  } else {
    return null;
  }
}

export function openConsoleName() {
  if (process.platform === 'darwin') {
    return 'Open in Terminal';
  } else if (process.platform === 'win32') {
    return 'Open in Cmd';
  } else {
    return null;
  }
}

export async function openFolderAsync(dir: string) {
  if (process.platform === 'darwin') {
    return await osascript.openFinderToFolderAsync(dir);
  } else if (process.platform === 'win32') {
    return await spawnAsync('explorer', [dir]);
  } else {
    throw new XDLError('PLATFORM_NOT_SUPPORTED', 'openFolderAsync not supported');
  }
}

export async function openConsoleAsync(dir: string) {
  if (process.platform === 'darwin') {
    await osascript.openFolderInTerminalAppAsync(dir);
  } else if (process.platform === 'win32') {
    execSync(`start cmd /K "cd /d ${dir}"`);
  } else {
    throw new XDLError('PLATFORM_NOT_SUPPORTED', 'openConsoleAsync not supported');
  }
}

export async function openFileInEditorAsync(path: string) {
  if (process.platform === 'darwin') {
    // This will use the ENV var $EXPO_EDITOR if set, or else will try various
    // popular editors, looking for one that is open, or if none are, one that is installed
    return await osascript.openInEditorAsync(path, process.env.EXPO_EDITOR);
  } else {
    throw new XDLError('PLATFORM_NOT_SUPPORTED', 'openFileInEditorAsync not supported');
  }
}

export async function openProjectInEditorAsync(dir: string) {
  if (process.platform === 'darwin') {
    // This will use the ENV var $EXPO_EDITOR if set, or else will try various
    // popular editors, looking for one that is open, or if none are, one that is installed
    return await osascript.openInEditorAsync(dir, process.env.EXPO_EDITOR);
  } else {
    throw new XDLError('PLATFORM_NOT_SUPPORTED', 'openProjectInEditorAsync not supported');
  }
}
