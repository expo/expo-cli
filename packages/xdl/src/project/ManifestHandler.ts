import { ExpoConfig, getConfig } from '@expo/config';
import express from 'express';
import http from 'http';
import os from 'os';
import { URL } from 'url';

import * as Analytics from '../Analytics';
import ApiV2 from '../ApiV2';
import Config from '../Config';
import * as Exp from '../Exp';
import { PublicConfig, resolveGoogleServicesFile, resolveManifestAssets } from '../ProjectAssets';
import * as ProjectSettings from '../ProjectSettings';
import * as UrlUtils from '../UrlUtils';
import UserManager, { ANONYMOUS_USERNAME } from '../User';
import UserSettings from '../UserSettings';
import * as Doctor from './Doctor';
import * as ProjectUtils from './ProjectUtils';

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

export function getManifestHandler(projectRoot: string) {
  return async (
    req: express.Request | http.IncomingMessage,
    res: express.Response | http.ServerResponse
  ) => {
    try {
      // We intentionally don't `await`. We want to continue trying even
      // if there is a potential error in the package.json and don't want to slow
      // down the request
      Doctor.validateWithNetworkAsync(projectRoot);
      // Get packager opts and then copy into bundleUrlPackagerOpts
      const packagerOpts = await ProjectSettings.readAsync(projectRoot);
      const { exp: manifest } = getConfig(projectRoot);
      const bundleUrlPackagerOpts = JSON.parse(JSON.stringify(packagerOpts));
      bundleUrlPackagerOpts.urlType = 'http';
      if (bundleUrlPackagerOpts.hostType === 'redirect') {
        bundleUrlPackagerOpts.hostType = 'tunnel';
      }
      manifest.xde = true; // deprecated
      manifest.developer = {
        tool: Config.developerTool,
        projectRoot,
      };
      manifest.packagerOpts = packagerOpts;
      manifest.env = {};
      for (const key of Object.keys(process.env)) {
        if (shouldExposeEnvironmentVariableInManifest(key)) {
          manifest.env[key] = process.env[key];
        }
      }
      const platform = (req.headers['exponent-platform'] || 'ios').toString();
      const entryPoint = Exp.determineEntryPoint(projectRoot, platform);
      const mainModuleName = UrlUtils.guessMainModulePath(entryPoint);
      const queryParams = await UrlUtils.constructBundleQueryParamsAsync(projectRoot, packagerOpts);
      const path = `/${encodeURI(mainModuleName)}.bundle?platform=${encodeURIComponent(
        platform
      )}&${queryParams}`;
      const hostname = stripPort(req.headers.host);
      manifest.bundleUrl =
        (await UrlUtils.constructBundleUrlAsync(projectRoot, bundleUrlPackagerOpts, hostname)) +
        path;
      manifest.debuggerHost = await UrlUtils.constructDebuggerHostAsync(projectRoot, hostname);
      manifest.mainModuleName = mainModuleName;
      manifest.logUrl = await UrlUtils.constructLogUrlAsync(projectRoot, hostname);
      manifest.hostUri = await UrlUtils.constructHostUriAsync(projectRoot, hostname);
      await resolveManifestAssets({
        projectRoot,
        manifest: manifest as PublicConfig,
        async resolver(path) {
          return manifest.bundleUrl.match(/^https?:\/\/.*?\//)[0] + 'assets/' + path;
        },
      }); // the server normally inserts this but if we're offline we'll do it here
      await resolveGoogleServicesFile(projectRoot, manifest);
      const hostUUID = await UserSettings.anonymousIdentifier();
      const currentSession = await UserManager.getSessionAsync();
      if (!currentSession || Config.offline) {
        manifest.id = `@${ANONYMOUS_USERNAME}/${manifest.slug}-${hostUUID}`;
      }
      let manifestString;
      if (req.headers['exponent-accept-signature']) {
        manifestString =
          !currentSession || Config.offline
            ? getUnsignedManifestString(manifest)
            : await getSignedManifestStringAsync(manifest, currentSession);
      } else {
        manifestString = JSON.stringify(manifest);
      }
      const hostInfo = {
        host: hostUUID,
        server: 'xdl',
        serverVersion: require('@expo/xdl/package.json').version,
        serverDriver: Config.developerTool,
        serverOS: os.platform(),
        serverOSVersion: os.release(),
      };
      res.setHeader('Exponent-Server', JSON.stringify(hostInfo));
      res.end(manifestString);
      Analytics.logEvent('Serve Manifest', {
        projectRoot,
        developerTool: Config.developerTool,
        sdkVersion: manifest.sdkVersion ?? null,
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

export async function getSignedManifestStringAsync(
  manifest: ExpoConfig,
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
