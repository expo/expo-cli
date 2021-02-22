import freeportAsync from 'freeport-async';

import XDLError from '../XDLError';

export async function getFreePortAsync(rangeStart: number) {
  const port = await freeportAsync(rangeStart, { hostnames: [null, 'localhost'] });
  if (!port) {
    throw new XDLError('NO_PORT_FOUND', 'No available port found');
  }

  return port;
}
