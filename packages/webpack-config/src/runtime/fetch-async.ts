/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

function getLoadingView() {
  // On web, this would be like tapping the URL text-input loading bar... so not available.
  if (process.env.PLATFORM === 'web' || !process.env.PLATFORM) {
    return {
      showMessage() {},
      hide() {},
    };
  }
  const LoadingView = require('react-native/Libraries/Utilities/LoadingView');
  return LoadingView;
}

let pendingRequests = 0;

function asyncRequest(url: string): Promise<{ body: string; headers: { [key: string]: string } }> {
  let id = null;
  let responseText = null;
  let headers = null;
  let dataListener;
  let completeListener;
  let responseListener;

  console.log('webpack.load.l.2', url);
  const Networking = require('react-native/Libraries/Network/RCTNetworking');
  console.log('webpack.load.l.3', url);

  return new Promise((resolve, reject) => {
    dataListener = Networking.addListener('didReceiveNetworkData', ([requestId, response]) => {
      if (requestId === id) {
        responseText = response;
      }
    });
    responseListener = Networking.addListener(
      'didReceiveNetworkResponse',
      ([requestId, status, responseHeaders]) => {
        if (requestId === id) {
          headers = responseHeaders;
        }
      }
    );
    completeListener = Networking.addListener(
      'didCompleteNetworkResponse',
      ([requestId, error]) => {
        if (requestId === id) {
          if (error) {
            reject(error);
          } else {
            resolve({ body: responseText, headers });
          }
        }
      }
    );
    Networking.sendRequest(
      'GET',
      'asyncRequest',
      url,
      {},
      '',
      'text',
      false,
      0,
      requestId => {
        id = requestId;
      },
      true
    );
  }).finally(() => {
    dataListener && dataListener.remove();
    completeListener && completeListener.remove();
    responseListener && responseListener.remove();
  });
}

function loadBundle(url: string) {
  getLoadingView().showMessage('Downloading...', 'load');
  return asyncRequest(url)
    .then(({ body, headers }) => {
      if (
        headers['Content-Type'] != null &&
        headers['Content-Type'].indexOf('application/json') >= 0
      ) {
        // Errors are returned as JSON.
        throw new Error(JSON.parse(body).message || `Unknown error fetching '${url}'`);
      }
      // Some engines do not support `sourceURL` as a comment. We expose a
      // `globalEvalWithSourceUrl` function to handle updates in that case.
      if (global.globalEvalWithSourceUrl) {
        global.globalEvalWithSourceUrl(body, url);
      } else {
        // eslint-disable-next-line no-eval
        eval(body);
      }
      return body;
    })
    .finally(() => {
      if (!--pendingRequests) {
        getLoadingView().hide();
      }
    });
}

const importBundlePromises: Record<string, any> = {};

// @ts-ignore
__webpack_require__.l = function (
  url: string,
  done: Function,
  key: string,
  chunkId: string = url
): Promise<any> {
  try {
    const stringModuleID = String(chunkId);

    if (!importBundlePromises[stringModuleID]) {
      importBundlePromises[stringModuleID] = loadBundle(url).then(body => {
        console.log('webpack.load.l.done', body);
        return done({});
      });
    }
    return importBundlePromises[stringModuleID];
  } catch (error) {
    console.log('webpack.load.l.die', error);
    throw error;
  }
};
