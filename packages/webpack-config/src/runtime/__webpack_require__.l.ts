import * as LoadingView from './LoadingView';
import { requestAsync } from './requestAsync';

let pending = 0;

async function loadBundle(url: string) {
  const reqHeaders = {
    // Required for android
    accept: '*/*',
    // Required for multi-platform dev server
    'expo-platform': LoadingView.getPlatform(),
  };

  try {
    const { body, headers } = await requestAsync(url, reqHeaders);
    if (!body) {
      throw new Error('unexpected request returned an empty body: ' + url);
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
  } finally {
    // This is probably not needed and should be removed
    if (!--pending) {
      LoadingView.hide();
    }
  }
}

const requirePromises: Record<string, any> = {};

// @ts-ignore
__webpack_require__.l = function (
  url: string,
  done: Function,
  key: string,
  chunkId: string = url
): Promise<any> {
  try {
    const stringModuleID = String(chunkId);

    if (!requirePromises[stringModuleID]) {
      console.log('[webpack.l] start', chunkId);
      requirePromises[stringModuleID] = loadBundle(url).then(body => {
        console.log('[webpack.l] done', url);
        return done({});
      });
    }
    return requirePromises[stringModuleID];
  } catch (error) {
    console.log('[webpack.l] fail', error);
    throw error;
  }
};
