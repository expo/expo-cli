import { execSync } from 'child_process';

import { isUsingNpm } from './nodeWorkspaces';

export default function shouldUseYarn(): boolean {
  try {
    if (process.env.npm_config_user_agent?.startsWith('yarn')) {
      return true;
    }

    execSync('yarnpkg --version', { stdio: 'ignore' });

    if (isUsingNpm(process.cwd())) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
