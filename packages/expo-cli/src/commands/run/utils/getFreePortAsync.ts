import chalk from 'chalk';
import freeportAsync from 'freeport-async';
import getenv from 'getenv';

import CommandError from '../../../CommandError';
import Log from '../../../log';

export async function getFreePortAsync(rangeStart: number) {
  const port = await freeportAsync(rangeStart, { hostnames: [null, 'localhost'] });
  if (!port) {
    throw new CommandError('NO_PORT_FOUND', 'No available port found');
  }

  return port;
}

const DEFAULT_PORT = 8081;

export async function resolvePortAsync(possiblePort?: number): Promise<number> {
  let port = possiblePort;
  if (port == null) {
    port = getenv.int('RCT_METRO_PORT', -1);
    if (port === -1) {
      // Only use a free port if the user hasn't defined one manually.
      port = await getFreePortAsync(DEFAULT_PORT);
      Log.log(chalk.dim(`\u203A Using port ${port}`));
    }
  }
  // Side effect: Ensure everything uses the custom port.
  process.env.RCT_METRO_PORT = String(port);

  return port;
}
