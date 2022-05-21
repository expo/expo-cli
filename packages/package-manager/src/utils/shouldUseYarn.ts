import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

export default function shouldUseYarn(): boolean {
  try {
    if (process.env.npm_config_user_agent?.startsWith('yarn')) {
      return true;
    }

    if (npmLockfileExists()) {
      return false;
    }

    execSync('yarnpkg --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function npmLockfileExists(): boolean {
  return fs.existsSync(path.join(process.cwd(), 'package-lock.json'));
}
