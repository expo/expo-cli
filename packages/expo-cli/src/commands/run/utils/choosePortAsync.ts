import freeportAsync from 'freeport-async';
import isRoot from 'is-root';

import Log from '../../../log';
import { confirmAsync } from '../../../prompts';
import { getRunningProcess } from './getRunningProcess';

export async function choosePortAsync(defaultPort: number): Promise<number | null> {
  try {
    const port = await freeportAsync(defaultPort);
    if (port === defaultPort) {
      return port;
    }

    const isRestricted = process.platform !== 'win32' && defaultPort < 1024 && !isRoot();

    const message = isRestricted
      ? `Admin permissions are required to run a server on a port below 1024.`
      : `Port ${defaultPort} is busy`;

    const runningProcess = isRestricted ? null : getRunningProcess(defaultPort);

    Log.log('\u203A ' + message + (runningProcess ? ` running: ${runningProcess}` : ''));
    const change = await confirmAsync({
      message: `Use ${port} instead?`,
      initial: true,
    });
    return change ? port : null;
  } catch (error) {
    if (error.code === 'ABORTED') {
      throw error;
    } else if (error.code === 'NON_INTERACTIVE') {
      Log.warn(error.message);
      return null;
    }
    throw error;
  }
}
