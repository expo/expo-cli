// adapted from https://github.com/expo/expo-cli/blob/d00319aae4fdcacf1a335af5a8428c45b62fc4d7/packages/expo-cli/src/commands/info/doctor/windows.ts
// modified to return a boolean instead of printing a warning

import { yellow } from 'chalk';
import { execFile } from 'child_process';
import { promisify } from 'util';

// I deliberately use `execFile` instead of `spawn`, because I expect the output of known format always.
const execFileAsync = promisify(execFile);

/**
 * Checks if the current shell is Windows Command Prompt or PowerShell.
 * This should only return true at this point if running on PowerShell, as we have a separate check for Command Prompt
 * when Doctor first starts.
 * Returns false if WSL.
 * @returns true if the current shell is Windows Command Prompt or PowerShell
 */
export function isWindowsShell(): boolean {
  return process.platform === 'win32';
}

/**
 * Windows only. On any other platform (including WSL on Windows), returns false immediately.
 *
 * Checks whether the script is executed from `cmd.exe'.
 * @returns true if the script is executed from `cmd.exe'
 */
export async function isRunningOnCmdExeAsync(): Promise<boolean> {
  if (!isWindowsShell()) {
    return false;
  }

  // we're on Windows & we want to suggest using PowerShell instead of CMD
  // https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/tasklist

  // get process name to determine if it matches cmd.exe
  const { stdout, stderr } = await execFileAsync(
    'tasklist',
    ['/nh', '/fo', 'csv', '/fi', `PID eq ${process.ppid}`],
    { windowsHide: true }
  );
  if (!stdout.startsWith('') || stderr !== '') {
    // Message upon no command output or wrong input is printed without '"" and results are printed with them.
    return false;
  }

  const [parentProcessName] = stdout.match(/(?<=^").*?(?=",)/) || [''];
  if (parentProcessName.toLowerCase().includes('cmd.exe')) {
    return true;
  }
  return false;
}
