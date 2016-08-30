/**
 * @flow
 */

import child_process from 'child_process';
import spawnAsync from '@exponent/spawn-async';

import ErrorCode from './ErrorCode';
import XDLError from './XDLError';

let osascript;
if (process.platform === 'darwin') {
  osascript = require('@exponent/osascript');
}

export function openFolderName() {
  if (process.platform === 'darwin') {
    return 'Show in Finder';
  } else if (process.platform === 'win32') {
    return 'Show in File Explorer'
  }
}

export function openConsoleName() {
  if (process.platform === 'darwin') {
    return 'Open in Terminal';
  } else if (process.platform === 'win32') {
    return 'Open in Cmd'
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

export async function openProjectInEditorAsync(dir: string) {
  if (process.platform === 'darwin') {
    return await osascript.openInEditorAsync(dir);
  } else if (process.platform === 'win32') {
    throw new XDLError(ErrorCode.PLATFORM_NOT_SUPPORTED, 'openProjectInEditorAsync not supported');
  }
}
