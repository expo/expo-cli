import * as LoadingView from './LoadingView';
import { requestAsync } from './requestAsync';
import { debug } from './socket';

declare let __webpack_public_path__: string | undefined;

if (__webpack_public_path__) {
  // Refine for Genymotion support
  const { hostname } = window.location;
  __webpack_public_path__ = __webpack_public_path__.replace('localhost', hostname);
}

async function loadBundle(url: string) {
  const reqHeaders = {
    // Required for android
    accept: '*/*',
    // Required for multi-platform dev server
    'expo-platform': LoadingView.getPlatform(),
  };

  const { body, headers } = await requestAsync(url, reqHeaders);

  if (!body) {
    throw new Error('[webpack.l] Unexpected; request returned an empty body: ' + url);
  }
  if (
    headers?.['Content-Type'] != null &&
    headers?.['Content-Type'].indexOf('application/json') >= 0
  ) {
    // Errors are returned as JSON.
    throw new Error(JSON.parse(body).message || `Unknown error fetching '${url}'`);
  }
  // Some engines do not support `sourceURL` as a comment. We expose a
  // `globalEvalWithSourceUrl` function to handle updates in that case.
  // @ts-ignore
  if (global.globalEvalWithSourceUrl) {
    // @ts-ignore
    global.globalEvalWithSourceUrl(body, url);
  } else {
    // eslint-disable-next-line no-eval
    eval(body);
  }
  // TODO: Add a native variation of global eval for byte code.
  return body;
}

const requirePromises: Record<string, any> = {};

// @ts-ignore
__webpack_require__.l = function (
  url: string,
  done: Function,
  key: string,
  chunkId: string = url
): Promise<any> {
  if (chunkId !== undefined && key !== undefined) {
    // TODO: Load from offline chunks / manifest
    // return
  }

  if (
    process.env.NODE_ENV !== 'development' ||
    // @ts-ignore
    !module.hot
  ) {
    throw new Error('[webpack.l] HMR is disabled');
  }

  try {
    const stringModuleID = String(chunkId);

    if (!requirePromises[stringModuleID]) {
      debug('[webpack.l] start', chunkId);
      requirePromises[stringModuleID] = loadBundle(url).then(body => {
        debug('[webpack.l] done', url);
        return done({});
      });
    }
    return requirePromises[stringModuleID];
  } catch (error) {
    debug('[webpack.l] fail', error);
    throw error;
  }
};
