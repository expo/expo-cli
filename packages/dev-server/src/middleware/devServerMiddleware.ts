import type Log from '@expo/bunyan';
import {
  createDevServerMiddleware as createReactNativeDevServerMiddleware,
  securityHeadersMiddleware,
} from '@react-native-community/cli-server-api';
import bodyParser from 'body-parser';
import type { Server as ConnectServer } from 'connect';

import { prependMiddleware, replaceMiddlewareWith } from '../middlwareMutations';
import clientLogsMiddleware from './clientLogsMiddleware';
import createJsInspectorMiddleware from './createJsInspectorMiddleware';
import { remoteDevtoolsCorsMiddleware } from './remoteDevtoolsCorsMiddleware';
import { remoteDevtoolsSecurityHeadersMiddleware } from './remoteDevtoolsSecurityHeadersMiddleware';
import { suppressRemoteDebuggingErrorMiddleware } from './suppressErrorMiddleware';

// export type AttachToServerFunction = ReturnType<
//   typeof createReactNativeDevServerMiddleware
// >['attachToServer'];

/**
 * Extends the default `createDevServerMiddleware` and adds some Expo CLI-specific dev middleware
 * with exception for the manifest middleware which is currently in `xdl`.
 *
 * Adds:
 * - `/logs`: pipe runtime `console` logs to the `props.logger` object.
 * - `/inspector`: launch hermes inspector proxy in chrome.
 * - CORS support for remote devtools
 * - body parser middleware
 *
 * @param props.watchFolders array of directory paths to use with watchman
 * @param props.port port that the dev server will run on
 * @param props.logger bunyan instance that all runtime `console` logs will be piped through.
 *
 * @returns
 */
export function createDevServerMiddleware({
  watchFolders,
  port,
  logger,
}: {
  watchFolders: readonly string[];
  port: number;
  logger: Log;
}): {
  middleware: ConnectServer;
  debuggerProxyEndpoint: object;
  messageSocketEndpoint: object;
  eventsSocketEndpoint: object;
  websocketEndpoints: object;
  logger: Log;
} {
  const {
    middleware,
    debuggerProxyEndpoint,
    messageSocketEndpoint,
    eventsSocketEndpoint,
    websocketEndpoints,
  } = createReactNativeDevServerMiddleware({
    port,
    watchFolders,
  });

  // securityHeadersMiddleware does not support cross-origin requests for remote devtools to get the sourcemap.
  // We replace with the enhanced version.
  replaceMiddlewareWith(
    middleware as ConnectServer,
    securityHeadersMiddleware,
    remoteDevtoolsSecurityHeadersMiddleware
  );
  middleware.use(remoteDevtoolsCorsMiddleware);
  prependMiddleware(middleware, suppressRemoteDebuggingErrorMiddleware);

  middleware.use(bodyParser.json());
  middleware.use('/logs', clientLogsMiddleware(logger));
  middleware.use('/inspector', createJsInspectorMiddleware());

  console.log(middleware);
  return {
    middleware,
    debuggerProxyEndpoint,
    messageSocketEndpoint,
    eventsSocketEndpoint,
    websocketEndpoints,
    logger,
  };
}
