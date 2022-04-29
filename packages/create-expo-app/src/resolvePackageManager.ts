import * as PackageManager from '@expo/package-manager';
import { execSync } from 'child_process';

export type PackageManagerName = 'npm' | 'pnpm' | 'yarn';

/** Determine which package manager to use for installing dependencies based on how the process was started. */
export function resolvePackageManager(): PackageManagerName {
  // Attempt to detect if the user started the command using `yarn` or `pnpm`
  const userAgent = process.env.npm_config_user_agent;
  if (userAgent?.startsWith('yarn')) {
    return 'yarn';
  } else if (userAgent?.startsWith('pnpm')) {
    return 'pnpm';
  }

  // Try availability
  if (isPackageManagerAvailable('yarn')) {
    return 'yarn';
  } else if (isPackageManagerAvailable('pnpm')) {
    return 'pnpm';
  }

  return 'npm';
}

export function isPackageManagerAvailable(manager: PackageManagerName): boolean {
  try {
    execSync(`${manager} --version`, { stdio: 'ignore' });
    return true;
  } catch {}
  return false;
}

export function formatRunCommand(packageManager: PackageManagerName, cmd: string) {
  switch (packageManager) {
    case 'pnpm':
      return `pnpm run ${cmd}`;
    case 'yarn':
      return `yarn ${cmd}`;
    case 'npm':
    default:
      return `npm run ${cmd}`;
  }
}

export function formatSelfCommand() {
  const name = 'create-expo-app';
  const packageManager = resolvePackageManager();
  switch (packageManager) {
    case 'pnpm':
      return `pnpx ${name}`;
    case 'yarn':
    case 'npm':
    default:
      return `npx ${name}`;
  }
}

export async function installDependenciesAsync(
  projectRoot: string,
  packageManager: PackageManagerName,
  flags: { silent: boolean } = { silent: false }
) {
  const options = { cwd: projectRoot, silent: flags.silent };
  if (packageManager === 'yarn') {
    await new PackageManager.YarnPackageManager(options).installAsync();
  } else if (packageManager === 'pnpm') {
    await new PackageManager.PnpmPackageManager(options).installAsync();
  } else {
    await new PackageManager.NpmPackageManager(options).installAsync();
  }
}
