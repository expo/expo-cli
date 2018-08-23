/**
 * @flow
 */

import child_process from 'child_process';
import spawnAsync from '@expo/spawn-async';

import * as Binaries from './Binaries';
import ErrorCode from './ErrorCode';
import XDLError from './XDLError';

let osascript;
if (process.platform === 'darwin') {
  osascript = require('@expo/osascript');
}

export function openFolderName() {
  if (process.platform === 'darwin') {
    return 'Show in Finder';
  } else if (process.platform === 'win32') {
    return 'Show in File Explorer';
  }
}

export function openConsoleName() {
  if (process.platform === 'darwin') {
    return 'Open in Terminal';
  } else if (process.platform === 'win32') {
    return 'Open in Cmd';
  }
}

export async function openFolderAsync(dir: string) {
  if (process.platform === 'darwin') {
    return await osascript.openFinderToFolderAsync(dir);
  } else if (process.platform === 'win32') {
    return await spawnAsync('explorer', [dir]);
  }
}

export async function openConsoleAsync(dir: string) {
  if (process.platform === 'darwin') {
    return await osascript.openFolderInTerminalAppAsync(dir);
  } else if (process.platform === 'win32') {
    child_process.exec(`start cmd /K "cd /d ${dir}"`);
  }
}

export async function openFileInEditorAsync(path: string) {
  if (process.platform === 'darwin') {
    // This will use the ENV var $EXPO_EDITOR if set, or else will try various
    // popular editors, looking for one that is open, or if none are, one that is installed
    await Binaries.sourceBashLoginScriptsAsync();
    return await osascript.openInEditorAsync(path, process.env.EXPO_EDITOR);
  } else if (process.platform === 'win32') {
    throw new XDLError(ErrorCode.PLATFORM_NOT_SUPPORTED, 'openFileInEditorAsync not supported');
  }
}

export async function openProjectInEditorAsync(dir: string) {
  if (process.platform === 'darwin') {
    // This will use the ENV var $EXPO_EDITOR if set, or else will try various
    // popular editors, looking for one that is open, or if none are, one that is installed
    await Binaries.sourceBashLoginScriptsAsync();
    return await osascript.openInEditorAsync(dir, process.env.EXPO_EDITOR);
  } else if (process.platform === 'win32') {
    throw new XDLError(ErrorCode.PLATFORM_NOT_SUPPORTED, 'openProjectInEditorAsync not supported');
  }
}
