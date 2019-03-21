/**
 * Utilities for working with `osascript` which runs AppleScript on Macs
 */
'use strict';

import execAsync from 'exec-async';
import path from 'path';
import spawnAsync from '@expo/spawn-async';
import util from 'util';

function osascriptArgs(script) {
  if (!util.isArray(script)) {
    script = [script];
  }

  let args = [];
  for (let line of script) {
    args.push('-e');
    args.push(line);
  }

  return args;
}

async function osascriptExecAsync(script, opts) {
  return await execAsync(
    'osascript',
    osascriptArgs(script),
    Object.assign({ stdio: 'inherit' }, opts)
  );
}

async function osascriptSpawnAsync(script, opts) {
  return await spawnAsync('osascript', osascriptArgs(script), opts);
}

async function isAppRunningAsync(appName) {
  let zeroMeansNo = (await osascriptExecAsync(
    'tell app "System Events" to count processes whose name is ' + JSON.stringify(appName)
  )).trim();
  return zeroMeansNo !== '0';
}

async function safeIdOfAppAsync(appName) {
  try {
    return (await osascriptExecAsync('id of app ' + JSON.stringify(appName))).trim();
  } catch (e) {
    return null;
  }
}

async function openFinderToFolderAsync(dir, activate = true) {
  await osascriptSpawnAsync([
    'tell application "Finder"',
    'open POSIX file ' + JSON.stringify(dir),
    (activate && 'activate') || '',
    'end tell',
  ]);
}

async function openInAppAsync(appName, pth) {
  let cmd = 'tell app ' + JSON.stringify(appName) + ' to open ' + JSON.stringify(path.resolve(pth));
  // console.log("cmd=", cmd);
  return await osascriptSpawnAsync(cmd);
}

async function chooseAppAsync(listOfAppNames) {
  let runningAwaitables = [];
  let appIdAwaitables = [];
  for (let appName of listOfAppNames) {
    runningAwaitables.push(isAppRunningAsync(appName));
    appIdAwaitables.push(safeIdOfAppAsync(appName));
  }
  let running = await Promise.all(runningAwaitables);
  let appIds = await Promise.all(appIdAwaitables);

  let i;
  for (i = 0; i < listOfAppNames.length; i++) {
    if (running[i]) {
      return listOfAppNames[i];
    }
  }

  for (i = 0; i < listOfAppNames.length; i++) {
    if (appIds[i]) {
      return listOfAppNames[i];
    }
  }

  return null;
}

async function chooseEditorAppAsync(preferredEditor) {
  if (preferredEditor) {
    // Make sure this editor exists
    let appId = await safeIdOfAppAsync(preferredEditor);
    if (appId) {
      return preferredEditor;
    } else {
      console.warn(`Your preferred editor (${preferredEditor}) isn't installed on this computer.`);
    }
  }

  let editorsToTry = [
    'Visual Studio Code',
    'Atom',
    'Sublime Text',
    'TextMate',
    'TextWrangler',
    'Visual Studio Code',
    'Brackets',
    'SubEthaEdit',
    'BBEdit',
    'Textastic',
    'UltraEdit',
    'MacVim',
    'CodeRunner 2',
    'CodeRunner',
    'TextEdit',
  ];

  return await chooseAppAsync(editorsToTry);
}

async function chooseTerminalAppAsync() {
  return await chooseAppAsync([
    'iTerm 3',
    'iTerm 2',
    'iTerm',
    'HyperTerm',
    // 'Cathode',
    // 'Terminator',
    // 'MacTerm',
    'Terminal',
  ]);
}

async function openInEditorAsync(pth, preferredEditor) {
  let appName = await chooseEditorAppAsync(preferredEditor);
  console.log('Will open in ' + appName + ' -- ' + pth);
  return await openInAppAsync(appName, pth);
}

async function openItermToSpecificFolderAsync(dir) {
  return await osascriptSpawnAsync([
    'tell application "iTerm"',
    'make new terminal',
    'tell the first terminal',
    'activate current session',
    'launch session "Default Session"',
    'tell the last session',
    'write text "cd ' + util.inspect(dir) + ' && clear"',
    // 'write text "clear"',
    'end tell',
    'end tell',
    'end tell',
  ]);
  // exec("osascript -e 'tell application \"iTerm\"' -e 'make new terminal' -e 'tell the first terminal' -e 'activate current session' -e 'launch session \"Default Session\"' -e 'tell the last session' -e 'write text \"cd #{value}\"' -e 'write text \"clear\"' -e 'end tell' -e 'end tell' -e 'end tell' > /dev/null 2>&1")
}

async function openTerminalToSpecificFolderAsync(dir, inTab = false) {
  if (inTab) {
    return await osascriptSpawnAsync([
      'tell application "terminal"',
      'tell application "System Events" to tell process "terminal" to keystroke "t" using command down',
      'do script with command "cd ' +
        util.inspect(dir) +
        ' && clear" in selected tab of the front window',
      'end tell',
    ]);
  } else {
    return await osascriptSpawnAsync([
      'tell application "terminal"',
      'do script "cd ' + util.inspect(dir) + ' && clear"',
      'end tell',
      'tell application "terminal" to activate',
    ]);
  }
}

async function openFolderInTerminalAppAsync(dir, inTab = false) {
  let program = await chooseTerminalAppAsync();

  switch (program) {
    case 'iTerm':
      return await openItermToSpecificFolderAsync(dir, inTab);
      break;

    case 'Terminal':
    default:
      return await openTerminalToSpecificFolderAsync(dir, inTab);
      break;
  }
}

module.exports = {
  chooseAppAsync,
  chooseEditorAppAsync,
  chooseTerminalAppAsync,
  execAsync: osascriptExecAsync,
  isAppRunningAsync,
  openFinderToFolderAsync,
  openFolderInTerminalAppAsync,
  openInAppAsync,
  openInEditorAsync,
  openItermToSpecificFolderAsync,
  openTerminalToSpecificFolderAsync,
  safeIdOfAppAsync,
  spawnAsync: osascriptSpawnAsync,
};
