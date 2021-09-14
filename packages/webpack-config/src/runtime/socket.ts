/* global __webpack_dev_server_client__ */
// https://github.com/webpack/webpack-dev-server/blob/612c050b0e715016feacec7f96b69d53fc6d3330/client-src/socket.js

import * as LoadingView from './LoadingView';
import WebSocketClient from './WebSocketClient';

// this WebsocketClient is here as a default fallback, in case the client is not injected
/* eslint-disable camelcase */
const Client = WebSocketClient;
// const Client =
//   // eslint-disable-next-line camelcase, no-nested-ternary
//   typeof __webpack_dev_server_client__ !== 'undefined'
//     ? // eslint-disable-next-line camelcase
//       typeof __webpack_dev_server_client__.default !== 'undefined'
//       ? __webpack_dev_server_client__.default
//       : __webpack_dev_server_client__
//     : WebSocketClient;
/* eslint-enable camelcase */

let retries = 0;
let client = null;

const socket = function initSocket(url: string, handlers: Record<string, Function>) {
  client = new Client(url);

  client.onOpen(() => {
    retries = 0;
    handlers.open();
  });
  client.onError(error => {
    handlers.onError(error);
  });

  client.onClose(event => {
    if (retries === 0) {
      handlers.close(event);
    }

    // Try to reconnect.
    client = null;

    // After 10 retries stop trying, to prevent logspam.
    if (retries <= 10) {
      // Exponentially increase timeout to reconnect.
      // Respectfully copied from the package `got`.
      // eslint-disable-next-line no-mixed-operators, no-restricted-properties
      const retryInMs = 1000 * Math.pow(2, retries) + Math.random() * 100;

      retries += 1;

      setTimeout(() => {
        socket(url, handlers);
      }, retryInMs);
    }
  });

  client.onMessage(data => {
    const message = JSON.parse(data);

    const platforms: string[] = Array.isArray(message.platforms) ? message.platforms : [];

    const canDiffPlatforms = !!platforms.length && !!process.env.PLATFORM;
    if (canDiffPlatforms) {
      if (!platforms.includes(LoadingView.getPlatform())) {
        // console.log('[HMR] skipping misc platform:', platforms, message);
        return;
      } else {
        console.log('[HMR] do:', message);
      }
    } else {
      console.log('[HMR] universal', message);
    }

    if (handlers[message.type]) {
      handlers[message.type](message.data);
    }
  });
};

export default socket;
