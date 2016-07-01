/**
 * @flow
 */

import osascript from '@exponent/osascript';

export async function openFinderToFolderAsync(dir: string) {
  return await osascript.openFinderToFolderAsync(dir);
}

export async function openFolderInItermOrTerminalAsync(dir: string) {
  return await osascript.openFolderInTerminalAppAsync(dir);
}

export async function openProjectInEditorAsync(dir: string) {
  return await osascript.openInEditorAsync(dir);
}
