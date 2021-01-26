import * as PackageManager from '@expo/package-manager';
import getenv from 'getenv';
// @ts-ignore
import requireg from 'requireg';
import resolveFrom from 'resolve-from';
import semver from 'semver';

import Logger from '../Logger';
import { confirmAsync } from '../Prompts';

const NGROK_REQUIRED_VERSION = '^2.4.3';

export interface NgrokOptions {
  authtoken?: string;
  port?: string | number | null;
  host?: string;
  httpauth?: string;
  region?: string;
  configPath?: string;

  proto?: 'http' | 'tcp' | 'tls';
  addr?: string;
  inspect?: boolean;
  auth?: string;
  host_header?: string;
  bind_tls?: true | false | 'both';
  subdomain?: string;
  hostname?: string;
  crt?: string;
  key?: string;
  client_cas?: string;
  remote_addr?: string;
}

/**
 * Returns `true` if a global ngrok instance can be found.
 */
export async function isAvailableAsync(projectRoot: string): Promise<boolean> {
  try {
    return !!(await findNgrokBinAsync(projectRoot));
  } catch {
    return false;
  }
}
export async function resolveNgrokAsync(
  projectRoot: string,
  shouldPrompt: boolean = true
): Promise<any> {
  const inst = await findNgrokBinAsync(projectRoot);

  if (!inst) {
    const pkg = `@expo/ngrok@${NGROK_REQUIRED_VERSION}`;
    if (shouldPrompt) {
      // Delay the prompt so it doesn't conflict with other dev tool logs
      await new Promise(r => setTimeout(r, 100));
      const answer = await confirmAsync({
        message: `The package ${pkg} is required to use tunnels, would you like to install it globally?`,
        initial: true,
      });
      if (answer) {
        const packageManager = PackageManager.createForProject(projectRoot);
        await packageManager.addGlobalAsync(pkg);
        return await resolveNgrokAsync(projectRoot, false);
      }
    }
    throw new Error(
      `Please install ${pkg} and try again, or try using another hosting method like lan or localhost`
    );
  }
  return inst;
}

let _ngrokInstance: any | null = null;

const isDebug = getenv.boolish('EXPO_DEBUG', false);
// Resolve a copy that's installed in the project.
async function resolvePackageFromProjectAsync(projectRoot: string, version: string) {
  try {
    const ngrokCliPackagePath = resolveFrom(projectRoot, '@expo/ngrok/package.json');
    const ngrokCliPackage = require(ngrokCliPackagePath);
    if (ngrokCliPackage && semver.satisfies(ngrokCliPackage.version, version)) {
      const ngrokInstancePath = resolveFrom(projectRoot, '@expo/ngrok');
      if (isDebug) {
        Logger.global.info(`Resolving @expo/ngrok from project: "${ngrokInstancePath}"`);
      }
      return require(ngrokInstancePath);
    }
  } catch {
    //   fall back to global ngrok-cli
  }
  return null;
}

// Resolve a copy that's installed globally.
async function resolveGlobalPackageAsync(version: string) {
  try {
    // use true to disable the use of local packages.
    const ngrokPkgJson = requireg('@expo/ngrok/package.json', true);
    if (semver.satisfies(ngrokPkgJson.version, version)) {
      if (isDebug) {
        Logger.global.info(
          `Resolving global @expo/ngrok from: "${requireg.resolve('@expo/ngrok')}"`
        );
      }
      return requireg('@expo/ngrok', true);
    }
  } catch {}

  return null;
}

async function findNgrokBinAsync(projectRoot: string): Promise<any> {
  if (_ngrokInstance) {
    return _ngrokInstance;
  }

  const globalInstance = await resolveGlobalPackageAsync(NGROK_REQUIRED_VERSION);
  if (globalInstance) {
    _ngrokInstance = globalInstance;
    return _ngrokInstance;
  }

  const localInstance = await resolvePackageFromProjectAsync(projectRoot, NGROK_REQUIRED_VERSION);
  if (localInstance) {
    _ngrokInstance = localInstance;
    return _ngrokInstance;
  }

  return null;
}
