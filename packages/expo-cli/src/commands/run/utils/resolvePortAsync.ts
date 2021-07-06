import getenv from 'getenv';
import { choosePortAsync } from 'xdl/build/utils/choosePortAsync';

import Log from '../../../log';

export async function resolvePortAsync(
  projectRoot: string,
  {
    reuseExistingPort,
    defaultPort,
  }: {
    reuseExistingPort?: boolean;
    defaultPort?: string | number;
  } = {}
): Promise<number | null> {
  let port: number;
  if (typeof defaultPort === 'string') {
    port = parseInt(defaultPort, 10);
  } else if (typeof defaultPort === 'number') {
    port = defaultPort;
  } else {
    port = getenv.int('RCT_METRO_PORT', 8081);
  }

  // Only check the port when the bundler is running.
  const resolvedPort = await choosePortAsync(projectRoot, {
    defaultPort: port,
    reuseExistingPort,
  });
  if (resolvedPort == null) {
    Log.log('\u203A Skipping dev server');
    // Skip bundling if the port is null
  } else {
    // Use the new or resolved port
    process.env.RCT_METRO_PORT = String(resolvedPort);
  }

  return resolvedPort;
}
