import chalk from 'chalk';
import { ChildProcess } from 'child_process';

export interface LineFilter {
  filter(line: string): boolean;
}

// https://github.com/electron-userland/electron-webpack
// electron-webpack created this really great console filter, give them a star on Github if you get a chance!
function filterText(s: string, lineFilter: LineFilter | null) {
  const lines = s
    .trim()
    .split(/\r?\n/)
    .filter(it => {
      if (lineFilter != null && !lineFilter.filter(it)) {
        return false;
      }

      // https://github.com/electron/electron/issues/4420
      // this warning can be safely ignored
      if (it.includes("Couldn't set selectedTextBackgroundColor from default ()")) {
        return false;
      }
      if (it.includes("Use NSWindow's -titlebarAppearsTransparent=YES instead.")) {
        return false;
      }
      return (
        !it.includes('Warning: This is an experimental feature and could change at any time.') &&
        !it.includes('No type errors found') &&
        !it.includes('webpack: Compiled successfully.')
      );
    });

  if (lines.length === 0) {
    return null;
  }
  return '  ' + lines.join(`\n  `) + '\n';
}

export function logProcessErrorOutput(
  label: 'Electron' | 'Renderer' | 'Main',
  childProcess: ChildProcess,
  callback: (data: any) => void
) {
  childProcess.stderr!!.on('data', data => {
    logProcess(label, data.toString(), chalk.cyan);
    callback(data);
  });
}

export function logError(label: 'Electron' | 'Renderer' | 'Main', error: Error) {
  logProcess(label, error.stack || error.toString(), chalk.cyan);
}

const LABEL_LENGTH = 28;

export function logProcess(
  label: 'Electron' | 'Renderer' | 'Main',
  data: string | Buffer,
  labelColor: any,
  lineFilter: LineFilter | null = null
) {
  const log = filterText(data.toString(), lineFilter);
  if (log == null || log.length === 0) {
    return;
  }

  process.stdout.write(
    labelColor.bold(`┏ ${label} ${'-'.repeat(LABEL_LENGTH - label.length - 1)}`) +
      '\n\n' +
      log +
      '\n' +
      labelColor.bold(`┗ ${'-'.repeat(LABEL_LENGTH)}`) +
      '\n'
  );
}

export function getCommonEnv() {
  return {
    ...process.env,
    // NODE_ENV: 'development',
    // to force debug colors in the child process
    DEBUG_COLORS: true,
    DEBUG_FD: '1',
  };
}
