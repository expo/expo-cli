import { ExpoConfig, getConfig, getNameFromConfig } from '@expo/config';
import { getRuntimeVersionNullable, getSDKVersion } from '@expo/config-plugins/build/utils/Updates';
import express from 'express';
import { readFile } from 'fs-extra';
import http from 'http';
import { resolve } from 'path';
import { parse } from 'url';

import { UrlUtils } from './../internal';

export const LoadingEndpoint = '/_expo/loading';
export const DeepLinkEndpoint = '/_expo/link';

type OnDeepLinkListener = (
  projectRoot: string,
  isDevClient: boolean,
  platform: string | null
) => Promise<void>;

let onDeepLink: OnDeepLinkListener = async () => {};

export function setOnDeepLink(listener: OnDeepLinkListener) {
  onDeepLink = listener;
}

function getPlatform(
  query: { [x: string]: string | string[] | null },
  userAgent: string | null = null
): 'android' | 'ios' | null {
  if (query['platform'] === 'android' || query['platform'] === 'ios') {
    return query['platform'];
  }

  if (userAgent?.match(/Android/i)) {
    return 'android';
  }

  if (userAgent?.match(/iPhone|iPad/i)) {
    return 'ios';
  }

  return null;
}

function getRuntimeVersion(exp: ExpoConfig, platform: 'android' | 'ios' | null) {
  if (!platform) {
    return null;
  }

  return getRuntimeVersionNullable(exp, platform);
}

export function noCacheMiddleware(
  res: express.Response | http.ServerResponse
): express.Response | http.ServerResponse {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Expires', '-1');
  res.setHeader('Pragma', 'no-cache');
  return res;
}

async function loadingEndpointHandler(
  projectRoot: string,
  req: express.Request | http.IncomingMessage,
  res: express.Response | http.ServerResponse
) {
  res.setHeader('Content-Type', 'text/html');

  let content = (
    await readFile(resolve(__dirname, './../../static/loading-page/index.html'))
  ).toString('utf-8');

  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const { appName } = getNameFromConfig(exp);
  const { query } = parse(req.url!, true);
  const platform = getPlatform(query, req.headers['user-agent']);
  const runtimeVersion = getRuntimeVersion(exp, platform);

  content = content.replace(/{{\s*AppName\s*}}/, appName ?? 'App');

  content = content.replace(
    /{{\s*ProjectVersionType\s*}}/,
    runtimeVersion ? 'Runtime version' : 'SDK version'
  );

  content = content.replace(
    /{{\s*ProjectVersion\s*}}/,
    runtimeVersion ? runtimeVersion : getSDKVersion(exp) ?? 'Undetected'
  );

  content = content.replace(/{{\s*Path\s*}}/, projectRoot);

  res.end(content);
}

async function deeplinkEndpointHandler(
  projectRoot: string,
  req: express.Request | http.IncomingMessage,
  res: express.Response | http.ServerResponse
) {
  const { query } = parse(req.url!, true);
  const isDevClient = query['choice'] === 'expo-dev-client';
  const projectUrl = isDevClient
    ? await UrlUtils.constructDevClientUrlAsync(projectRoot)
    : await UrlUtils.constructManifestUrlAsync(projectRoot);

  res.setHeader('Location', projectUrl);

  onDeepLink(projectRoot, isDevClient, getPlatform(query, req.headers['user-agent']));

  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Expires', '-1');
  res.setHeader('Pragma', 'no-cache');

  res.statusCode = 307;
  res.end();
}

export function getLoadingPageHandler(projectRoot: string) {
  return async (
    req: express.Request | http.IncomingMessage,
    res: express.Response | http.ServerResponse,
    next: (err?: Error) => void
  ) => {
    if (!req.url) {
      next();
      return;
    }

    try {
      const url = parse(req.url).pathname || req.url;
      switch (url) {
        case LoadingEndpoint:
          await loadingEndpointHandler(projectRoot, req, noCacheMiddleware(res));
          break;
        case DeepLinkEndpoint:
          await deeplinkEndpointHandler(projectRoot, req, noCacheMiddleware(res));
          break;
        default:
          next();
      }
    } catch (exception) {
      res.statusCode = 520;
      if (typeof exception == 'object' && exception != null) {
        res.end(
          JSON.stringify({
            error: exception.toString(),
          })
        );
      } else {
        res.end(`Unexpected error: ${exception}`);
      }
    }
  };
}
