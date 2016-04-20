let osascript = require('@exponent/osascript');

async function openFinderToFolderAsync(dir) {
  return await osascript.openFinderToFolderAsync(dir);
}

async function openFolderInItermOrTerminalAsync(dir) {
  return await osascript.openFolderInTerminalAppAsync(dir);
}

async function openProjectInEditorAsync(dir) {
  return await osascript.openInEditorAsync(dir);
}

module.exports = {
  openFinderToFolderAsync,
  openFolderInItermOrTerminalAsync,
  openProjectInEditorAsync,
};
