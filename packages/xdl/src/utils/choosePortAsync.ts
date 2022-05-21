import chalk from 'chalk';
import freeportAsync from 'freeport-async';
import isRoot from 'is-root';

import Logger from '../Logger';
import { confirmAsync } from '../Prompts';
import { getRunningProcess } from './getRunningProcess';

export async function choosePortAsync(
  projectRoot: string,
  {
    defaultPort,
    host,
    reuseExistingPort,
  }: {
    defaultPort: number;
    host?: string;
    reuseExistingPort?: boolean;
  }
): Promise<number | null> {
  try {
    const port = await freeportAsync(defaultPort, { hostnames: [host ?? null] });
    if (port === defaultPort) {
      return port;
    }

    const isRestricted = process.platform !== 'win32' && defaultPort < 1024 && !isRoot();

    let message = isRestricted
      ? `Admin permissions are required to run a server on a port below 1024`
      : `Port ${chalk.bold(defaultPort)} is`;

    const runningProcess = isRestricted ? null : getRunningProcess(defaultPort);

    if (runningProcess) {
      const pidTag = chalk.gray(`(pid ${runningProcess.pid})`);
      if (runningProcess.directory === projectRoot) {
        message += ` running this app in another window`;
        if (reuseExistingPort) {
          return null;
        }
      } else {
        message += ` running ${chalk.cyan(runningProcess.command)} in another window`;
      }
      message += '\n' + chalk.gray(`  ${runningProcess.directory} ${pidTag}`);
    }

    Logger.global.info(`\u203A ${message}`);
    const change = await confirmAsync({
      message: `Use port ${port} instead?`,
      initial: true,
    });
    return change ? port : null;
  } catch (error: any) {
    if (error.code === 'ABORTED') {
      throw error;
    } else if (error.code === 'NON_INTERACTIVE') {
      Logger.global.warn(error.message);
      return null;
    }
    throw error;
  }
}
