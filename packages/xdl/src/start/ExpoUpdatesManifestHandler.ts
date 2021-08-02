import { ExpoUpdatesManifest, getConfig } from '@expo/config';
import { getRuntimeVersionForSDKVersion } from '@expo/sdk-runtime-versions';
import express from 'express';
import http from 'http';
import { parse } from 'url';
import { v4 as uuidv4 } from 'uuid';

import {
  Analytics,
  Config,
  ProjectAssets,
  ProjectUtils,
  resolveEntryPoint,
  UrlUtils,
} from '../internal';
import {
  getBundleUrlAsync,
  getExpoGoConfig,
  getPackagerOptionsAsync,
  stripPort,
} from './ManifestHandler';

function getPlatformFromRequest(req: express.Request | http.IncomingMessage): string {
  const url = req.url ? parse(req.url, /* parseQueryString */ true) : null;
  const platform = url?.query.platform || req.headers['expo-platform'];
  if (!platform) {
    throw new Error('Must specify expo-platform header or query parameter');
  }
  return String(platform);
}

export async function getManifestResponseAsync({
  projectRoot,
  platform,
  host,
}: {
  projectRoot: string;
  platform: string;
  host?: string;
}): Promise<{
  body: ExpoUpdatesManifest;
  headers: Map<string, number | string | readonly string[]>;
}> {
  const headers = new Map<string, any>();
  // set required headers for Expo Updates manifest specification
  headers.set('expo-protocol-version', 0);
  headers.set('expo-sfv-version', 0);
  headers.set('cache-control', 'private, max-age=0');
  headers.set('content-type', 'application/json');

  const hostname = stripPort(host);
  const [projectSettings, bundleUrlPackagerOpts] = await getPackagerOptionsAsync(projectRoot);
  const projectConfig = getConfig(projectRoot);
  const entryPoint = resolveEntryPoint(projectRoot, platform, projectConfig);
  const mainModuleName = UrlUtils.stripJSExtension(entryPoint);
  const expoConfig = projectConfig.exp;
  const expoGoConfig = await getExpoGoConfig({
    projectRoot,
    projectSettings,
    mainModuleName,
    hostname,
  });

  const hostUri = await UrlUtils.constructHostUriAsync(projectRoot, hostname);

  const runtimeVersion =
    expoConfig.runtimeVersion ??
    (expoConfig.sdkVersion ? getRuntimeVersionForSDKVersion(expoConfig.sdkVersion) : null);
  if (!runtimeVersion) {
    throw new Error('Must specify runtimeVersion or sdkVersion in app.json');
  }

  const bundleUrl = await getBundleUrlAsync({
    projectRoot,
    platform,
    projectSettings,
    bundleUrlPackagerOpts,
    mainModuleName,
    hostname,
  });

  // For each manifest asset (for example `icon`):
  // - set a field on the manifest containing a reference to the asset: iconAsset: { rawUrl?: string, assetKey?: string }
  // - gather the data needed to embed a reference to that asset in the expo-updates assets key
  const assets = await ProjectAssets.resolveAndCollectExpoUpdatesManifestAssets(
    projectRoot,
    expoConfig,
    path => bundleUrl!.match(/^https?:\/\/.*?\//)![0] + 'assets/' + path
  );

  const expoUpdatesManifest = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    runtimeVersion,
    launchAsset: {
      key: mainModuleName,
      contentType: 'application/javascript',
      url: bundleUrl,
    },
    assets,
    metadata: {}, // required for the client to detect that this is an expo-updates manifest
    extra: {
      eas: {}, // TODO(wschurman): somehow inject EAS config in here if known
      expoClient: {
        ...expoConfig,
        hostUri,
      },
      expoGo: expoGoConfig,
    },
  };

  return {
    body: expoUpdatesManifest,
    headers,
  };
}

export function getManifestHandler(projectRoot: string) {
  return async (
    req: express.Request | http.IncomingMessage,
    res: express.Response | http.ServerResponse,
    next: (err?: Error) => void
  ) => {
    if (!req.url || parse(req.url).pathname !== '/update-manifest-experimental') {
      next();
      return;
    }

    try {
      const { body, headers } = await getManifestResponseAsync({
        projectRoot,
        host: req.headers.host,
        platform: getPlatformFromRequest(req),
      });
      for (const [headerName, headerValue] of headers) {
        res.setHeader(headerName, headerValue);
      }
      res.end(JSON.stringify(body));

      Analytics.logEvent('Serve Expo Updates Manifest', {
        projectRoot,
        developerTool: Config.developerTool,
        runtimeVersion: (body as any).runtimeVersion,
      });
    } catch (e) {
      ProjectUtils.logError(projectRoot, 'expo', e.stack);
      res.statusCode = 520;
      res.end(
        JSON.stringify({
          error: e.toString(),
        })
      );
    }
  };
}
