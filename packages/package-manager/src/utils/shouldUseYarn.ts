import { execSync } from 'child_process';

export default function shouldUseYarn(): boolean {
  try {
    if (process.env.npm_config_user_agent?.startsWith('yarn')) {
      return true;
    }
    execSync('yarnpkg --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
