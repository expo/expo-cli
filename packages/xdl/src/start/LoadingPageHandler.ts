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

function getPlatform(query: { [x: string]: string | string[] | null }): string | null {
  if (query['platform'] === 'android' || query['platform'] === 'ios') {
    return query['platform'];
  }

  return null;
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
  req: express.Request | http.IncomingMessage,
  res: express.Response | http.ServerResponse
) {
  res.setHeader('Content-Type', 'text/html');

  res.end(
    (await readFile(resolve(__dirname, './../../static/loading-page/index.html'))).toString('utf-8')
  );
}

async function deeplinkEndpointHandler(
  projectRoot: string,
  req: express.Request | http.IncomingMessage,
  res: express.Response | http.ServerResponse
) {
  const { query } = parse(req.url!, true);
  const isDevClient = query['choice'] === 'expo-dev-client';
  if (isDevClient) {
    const projectUrl = await UrlUtils.constructDevClientUrlAsync(projectRoot, {
      hostType: 'localhost',
    });
    res.setHeader('Location', projectUrl);
  } else {
    const projectUrl = await UrlUtils.constructManifestUrlAsync(projectRoot, {
      hostType: 'localhost',
    });
    res.setHeader('Location', projectUrl);
  }

  onDeepLink(projectRoot, isDevClient, getPlatform(query));

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
          await loadingEndpointHandler(req, noCacheMiddleware(res));
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
