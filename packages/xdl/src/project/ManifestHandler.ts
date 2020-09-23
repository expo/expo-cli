import { ExpoAppManifest, ExpoConfig, getConfig } from '@expo/config';
import express from 'express';
import http from 'http';
import os from 'os';
import { URL } from 'url';

import Analytics from '../Analytics';
import ApiV2 from '../ApiV2';
import Config from '../Config';
import * as Exp from '../Exp';
import { resolveGoogleServicesFile, resolveManifestAssets } from '../ProjectAssets';
import * as ProjectSettings from '../ProjectSettings';
import * as UrlUtils from '../UrlUtils';
import UserManager, { ANONYMOUS_USERNAME } from '../User';
import UserSettings from '../UserSettings';
import * as Doctor from './Doctor';
import * as ProjectUtils from './ProjectUtils';

interface HostInfo {
  host: string;
  server: 'xdl';
  serverVersion: string;
  serverDriver: string | null;
  serverOS: NodeJS.Platform;
  serverOSVersion: string;
}

type PackagerOptions = ProjectSettings.ProjectSettings;

type CachedSignedManifest =
  | {
      manifestString: null;
      signedManifest: null;
    }
  | {
      manifestString: string;
      signedManifest: string;
    };

const _cachedSignedManifest: CachedSignedManifest = {
  manifestString: null,
  signedManifest: null,
};

const blacklistedEnvironmentVariables = new Set([
  'EXPO_APPLE_PASSWORD',
  'EXPO_ANDROID_KEY_PASSWORD',
  'EXPO_ANDROID_KEYSTORE_PASSWORD',
  'EXPO_IOS_DIST_P12_PASSWORD',
  'EXPO_IOS_PUSH_P12_PASSWORD',
  'EXPO_CLI_PASSWORD',
]);

function shouldExposeEnvironmentVariableInManifest(key: string) {
  if (blacklistedEnvironmentVariables.has(key.toUpperCase())) {
    return false;
  }
  return key.startsWith('REACT_NATIVE_') || key.startsWith('EXPO_');
}

function stripPort(host: string | undefined): string | undefined {
  if (!host) {
    return host;
  }
  return new URL('/', `http://${host}`).hostname;
}

async function getPackagerOptionsAsync(
  projectRoot: string
): Promise<[PackagerOptions, PackagerOptions]> {
  // Get packager opts and then copy into bundleUrlPackagerOpts
  const packagerOpts = await ProjectSettings.readAsync(projectRoot);
  const bundleUrlPackagerOpts = JSON.parse(JSON.stringify(packagerOpts));
  bundleUrlPackagerOpts.urlType = 'http';
  if (bundleUrlPackagerOpts.hostType === 'redirect') {
    bundleUrlPackagerOpts.hostType = 'tunnel';
  }
  return [packagerOpts, bundleUrlPackagerOpts];
}

async function getBundleUrlAsync({
  projectRoot,
  platform,
  packagerOpts,
  bundleUrlPackagerOpts,
  mainModuleName,
  hostname,
}: {
  platform: string;
  hostname?: string;
  mainModuleName: string;
  projectRoot: string;
  packagerOpts: PackagerOptions;
  bundleUrlPackagerOpts: PackagerOptions;
}): Promise<string> {
  const queryParams = await UrlUtils.constructBundleQueryParamsAsync(projectRoot, packagerOpts);

  const path = `/${encodeURI(mainModuleName)}.bundle?platform=${encodeURIComponent(
    platform
  )}&${queryParams}`;

  return (
    (await UrlUtils.constructBundleUrlAsync(projectRoot, bundleUrlPackagerOpts, hostname)) + path
  );
}

function getPlatformFromRequest(headers: http.IncomingHttpHeaders): string {
  return (headers['exponent-platform'] || 'ios').toString();
}

export function getManifestHandler(projectRoot: string) {
  return async (
    req: express.Request | http.IncomingMessage,
    res: express.Response | http.ServerResponse
  ) => {
    try {
      // We intentionally don't `await`. We want to continue trying even
      // if there is a potential error in the package.json and don't want to slow
      // down the request
      Doctor.validateWithNetworkAsync(projectRoot).catch(error => {
        ProjectUtils.logError(
          projectRoot,
          'expo',
          `Error: could not load config json at ${projectRoot}: ${error.toString()}`,
          'doctor-config-json-not-read'
        );
      });

      const { manifestString, exp, hostInfo } = await getManifestResponseFromHeadersAsync({
        projectRoot,
        headers: req.headers,
      });
      const sdkVersion = exp.sdkVersion ?? null;

      // Send the response
      res.setHeader('Exponent-Server', JSON.stringify(hostInfo));
      // End the request
      res.end(manifestString);

      // Log analytics
      Analytics.logEvent('Serve Manifest', {
        projectRoot,
        developerTool: Config.developerTool,
        sdkVersion,
      });
    } catch (e) {
      ProjectUtils.logError(projectRoot, 'expo', e.stack);
      // 5xx = Server Error HTTP code
      res.statusCode = 520;
      res.end(
        JSON.stringify({
          error: e.toString(),
        })
      );
    }
  };
}

async function getManifestResponseFromHeadersAsync({
  projectRoot,
  headers,
}: {
  projectRoot: string;
  headers: http.IncomingHttpHeaders;
}): Promise<{ exp: ExpoConfig; manifestString: string; hostInfo: HostInfo }> {
  // Read from headers
  const platform = getPlatformFromRequest(headers);
  const acceptSignature = headers['exponent-accept-signature'];
  return getManifestResponseAsync({ projectRoot, host: headers.host, platform, acceptSignature });
}

export async function getManifestResponseAsync({
  projectRoot,
  host,
  platform,
  acceptSignature,
}: {
  projectRoot: string;
  platform: string;
  host?: string;
  acceptSignature?: string | string[];
}): Promise<{ exp: ExpoConfig; manifestString: string; hostInfo: HostInfo }> {
  // Read from headers
  const hostname = stripPort(host);

  // Get project entry point and initial module
  const entryPoint = Exp.determineEntryPoint(projectRoot, platform);
  const mainModuleName = UrlUtils.guessMainModulePath(entryPoint);

  // Gather packager and host info
  const hostInfo = await createHostInfoAsync();
  const [packagerOpts, bundleUrlPackagerOpts] = await getPackagerOptionsAsync(projectRoot);

  // Read the config
  const manifest = getConfig(projectRoot).exp as ExpoAppManifest;

  // Mutate the manifest
  manifest.xde = true; // deprecated
  manifest.developer = {
    tool: Config.developerTool,
    projectRoot,
  };
  manifest.packagerOpts = packagerOpts;
  manifest.mainModuleName = mainModuleName;
  manifest.env = getManifestEnvironment();
  // Add URLs to the manifest
  manifest.bundleUrl = await getBundleUrlAsync({
    projectRoot,
    platform,
    packagerOpts,
    bundleUrlPackagerOpts,
    mainModuleName,
    hostname,
  });
  manifest.debuggerHost = await UrlUtils.constructDebuggerHostAsync(projectRoot, hostname);
  manifest.logUrl = await UrlUtils.constructLogUrlAsync(projectRoot, hostname);
  manifest.hostUri = await UrlUtils.constructHostUriAsync(projectRoot, hostname);

  // Resolve all assets and set them on the manifest as URLs
  await resolveManifestAssets({
    projectRoot,
    manifest: manifest as ExpoAppManifest,
    async resolver(path) {
      return manifest.bundleUrl!.match(/^https?:\/\/.*?\//)![0] + 'assets/' + path;
    },
  });

  // The server normally inserts this but if we're offline we'll do it here
  await resolveGoogleServicesFile(projectRoot, manifest);

  // Create the final string
  const manifestString = await getManifestStringAsync(manifest, hostInfo.host, acceptSignature);

  return {
    manifestString,
    exp: manifest,
    hostInfo,
  };
}

function getManifestEnvironment(): Record<string, any> {
  return Object.keys(process.env).reduce<Record<string, any>>((prev, key) => {
    if (shouldExposeEnvironmentVariableInManifest(key)) {
      prev[key] = process.env[key];
    }
    return prev;
  }, {});
}

async function getManifestStringAsync(
  manifest: ExpoAppManifest,
  hostUUID: string,
  acceptSignature?: string | string[]
): Promise<string> {
  const currentSession = await UserManager.getSessionAsync();
  if (!currentSession || Config.offline) {
    manifest.id = `@${ANONYMOUS_USERNAME}/${manifest.slug}-${hostUUID}`;
  }
  if (acceptSignature) {
    return !currentSession || Config.offline
      ? getUnsignedManifestString(manifest)
      : await getSignedManifestStringAsync(manifest, currentSession);
  } else {
    return JSON.stringify(manifest);
  }
}

async function createHostInfoAsync(): Promise<HostInfo> {
  const host = await UserSettings.anonymousIdentifier();

  return {
    host,
    server: 'xdl',
    serverVersion: require('@expo/xdl/package.json').version,
    serverDriver: Config.developerTool,
    serverOS: os.platform(),
    serverOSVersion: os.release(),
  };
}

export async function getSignedManifestStringAsync(
  manifest: Partial<ExpoAppManifest>,
  // NOTE: we currently ignore the currentSession that is passed in, see the note below about analytics.
  currentSession: { sessionSecret?: string; accessToken?: string }
) {
  const manifestString = JSON.stringify(manifest);
  if (_cachedSignedManifest.manifestString === manifestString) {
    return _cachedSignedManifest.signedManifest;
  }
  // WARNING: Removing the following line will regress analytics, see: https://github.com/expo/expo-cli/pull/2357
  // TODO: make this more obvious from code
  const user = await UserManager.ensureLoggedInAsync();
  const { response } = await ApiV2.clientForUser(user).postAsync('manifest/sign', {
    args: {
      remoteUsername: manifest.owner ?? (await UserManager.getCurrentUsernameAsync()),
      remotePackageName: manifest.slug,
    },
    manifest,
  });
  _cachedSignedManifest.manifestString = manifestString;
  _cachedSignedManifest.signedManifest = response;
  return response;
}

export function getUnsignedManifestString(manifest: ExpoConfig) {
  const unsignedManifest = {
    manifestString: JSON.stringify(manifest),
    signature: 'UNSIGNED',
  };
  return JSON.stringify(unsignedManifest);
}
