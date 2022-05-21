import { execSync } from 'child_process';

import { resolvePackageManager } from './nodeWorkspaces';

export default function shouldUseYarn(): boolean {
  try {
    if (process.env.npm_config_user_agent?.startsWith('yarn')) {
      return true;
    }

    execSync('yarnpkg --version', { stdio: 'ignore' });

    return isNotUsingNpm();
  } catch {
    return false;
  }
}

/**
 * Returns true if the project does not have an npm lockfile, false otherwise.
 */
function isNotUsingNpm(): boolean {
  return resolvePackageManager(process.cwd(), 'npm') === null;
}
