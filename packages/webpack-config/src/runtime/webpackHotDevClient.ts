/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';
// @ts-ignore: untyped
import hotEmitter from 'webpack/hot/emitter.js';

import * as LoadingView from './LoadingView';
import socket, { debug } from './socket';

// This alternative WebpackDevServer combines the functionality of:
// https://github.com/webpack/webpack-dev-server/blob/webpack-1/client/index.js
// https://github.com/webpack/webpack/blob/webpack-1/hot/dev-server.js

// It only supports their simplest configuration (hot updates on same server).
// It makes some opinionated choices on top, like adding a syntax error overlay
// that looks similar to our console output. The error overlay is inspired by:
// https://github.com/glenjamin/webpack-hot-middleware

const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const ErrorOverlay = require('react-error-overlay');
const stripAnsi = require('strip-ansi');
const url = require('url');

const openEditorEndpoint = getDevServerUrl('open-stack-frame');

// @ts-ignore
ErrorOverlay.setEditorHandler(function editorHandler(errorLocation) {
  // Keep this sync with errorOverlayMiddleware.js
  // @ts-ignore
  fetch(openEditorEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      file: errorLocation.fileName,
      lineNumber: errorLocation.lineNumber,
      // TODO: The RN middleware currently doesn't support colNumber
      colNumber: errorLocation.colNumber,
    }),
  });
});

// We need to keep track of if there has been a runtime error.
// Essentially, we cannot guarantee application state was not corrupted by the
// runtime error. To prevent confusing behavior, we forcibly reload the entire
// application. This is handled below when we are notified of a compile (code
// change).
// See https://github.com/facebook/create-react-app/issues/3096
let hadRuntimeError = false;
ErrorOverlay.startReportingRuntimeErrors({
  onError() {
    hadRuntimeError = true;
  },
  filename: '/static/js/bundle.js',
});

// @ts-ignore
if (module.hot && typeof module.hot.dispose === 'function') {
  // @ts-ignore
  module.hot.dispose(function () {
    // TODO: why do we need this?
    ErrorOverlay.stopReportingRuntimeErrors();
  });
}

const sockUrl = getDevServerUrl(process.env.WDS_SOCKET_PATH || '/_expo/ws');

function getDevServerUrl(pathname: string) {
  return url.format({
    // @ts-ignore
    protocol: window.location.protocol === 'https:' ? 'wss' : 'ws',
    // @ts-ignore
    hostname: process.env.WDS_SOCKET_HOST || window.location.hostname,
    // @ts-ignore
    port: process.env.WDS_SOCKET_PORT || window.location.port,
    // Hardcoded in WebpackDevServer
    pathname,
    slashes: true,
  });
}

socket(sockUrl, {
  open() {
    debug('[HMR] client connected');
  },
  close(event: { isTrusted: boolean; message: string }) {
    LoadingView.hide();
    setDisconnected(
      'The development server has disconnected.\nRefresh the page if necessary. ' + event.message
    );
  },
  onError(e: Error) {
    if (!(typeof console !== 'undefined' && typeof console.warn === 'function')) return;

    let error = `Cannot connect to the development server.
  
  Try the following to fix the issue:
  - Ensure that Expo CLI is running and available on the same network`;

    if (LoadingView.getPlatform() !== 'ios') {
      error += `
  - Ensure that your device/emulator is connected to your machine and has USB debugging enabled - run 'adb devices' to see a list of connected devices
  - If you're on a physical device connected to the same machine, run 'adb reverse tcp:8081 tcp:8081' to forward requests from your device
  - If your device is on the same Wi-Fi network, set 'Debug server host & port for device' in 'Dev settings' to your machine's IP address and the port of the local dev server - e.g. 10.0.1.1:8081`;
    }

    error += `
  
  URL: ${sockUrl}
  
  Error: ${e.message}`;

    setDisconnected(error);
  },
  // Custom for Expo
  invalid() {
    LoadingView.showMessage('Rebuilding...', 'refresh');
    // debug('[HMRClient] Bundle rebuilding', message);
  },
  hash(hash: string) {
    // There is a newer version of the code available.
    // Update last known compilation hash.
    mostRecentCompilationHash = hash;
  },

  'still-ok': () => {
    handleSuccess();
  },

  ok() {
    handleSuccess();
    hotEmitter.emit('webpackHotUpdate', mostRecentCompilationHash);
  },

  'static-changed': () => window.location.reload(),
  // Triggered when a file from `contentBase` changed.
  'content-changed': () => window.location.reload(),

  warnings: handleWarnings,
  errors: handleErrors,
});

let disconnectedReason: string | null = null;

function setDisconnected(reason: string) {
  if (disconnectedReason) return;

  disconnectedReason = reason;
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(reason);
  }
}

// Remember some state related to hot module replacement.
let isFirstCompilation = true;
// @ts-ignore
let mostRecentCompilationHash: string | null = null;
let hasCompileErrors = false;

function clearOutdatedErrors() {
  // Clean up outdated compile errors, if any.
  if (typeof console !== 'undefined' && typeof console.clear === 'function') {
    if (hasCompileErrors) {
      LoadingView.dismissBuildError();
    }
  }
}

// Successful compilation.
function handleSuccess() {
  LoadingView.hide();
  clearOutdatedErrors();

  const isHotUpdate = !isFirstCompilation;
  isFirstCompilation = false;
  hasCompileErrors = false;

  // Attempt to apply hot updates or reload.
  if (isHotUpdate) {
    tryApplyUpdates(function onHotUpdateSuccess() {
      // Only dismiss it when we're sure it's a hot update.
      // Otherwise it would flicker right before the reload.
      tryDismissErrorOverlay();
    });
  }
}

// Compilation with warnings (e.g. ESLint).
// @ts-ignore
function handleWarnings(warnings) {
  clearOutdatedErrors();

  const isHotUpdate = !isFirstCompilation;
  isFirstCompilation = false;
  hasCompileErrors = false;

  function printWarnings() {
    // Print warnings to the console.
    const formatted = formatWebpackMessages({
      warnings,
      errors: [],
    });

    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      for (let i = 0; i < formatted.warnings.length; i++) {
        if (i === 5) {
          console.warn(
            'There were more warnings in other files.\n' +
              'You can find a complete log in the terminal.'
          );
          break;
        }
        console.warn(stripAnsi(formatted.warnings[i]));
      }
    }
  }

  printWarnings();

  // Attempt to apply hot updates or reload.
  if (isHotUpdate) {
    tryApplyUpdates(function onSuccessfulHotUpdate() {
      // Only dismiss it when we're sure it's a hot update.
      // Otherwise it would flicker right before the reload.
      tryDismissErrorOverlay();
    });
  }
}

// Compilation with errors (e.g. syntax error or missing modules).
// @ts-ignore
function handleErrors(errors) {
  clearOutdatedErrors();

  isFirstCompilation = false;
  hasCompileErrors = true;

  // "Massage" webpack messages.
  const formatted = formatWebpackMessages({
    errors,
    warnings: [],
  });

  // Only show the first error.
  ErrorOverlay.reportBuildError(formatted.errors[0]);

  // Also log them to the console.
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    for (let i = 0; i < formatted.errors.length; i++) {
      console.error(stripAnsi(formatted.errors[i]));
    }
  }

  // Do not attempt to reload now.
  // We will reload on next success instead.
}

function tryDismissErrorOverlay() {
  if (!hasCompileErrors) {
    ErrorOverlay.dismissBuildError();
  }
}

// Is there a newer version of this code available?
function isUpdateAvailable() {
  /* globals __webpack_hash__ */
  // __webpack_hash__ is the hash of the current compilation.
  // It's a global variable injected by webpack.
  // @ts-ignore
  return mostRecentCompilationHash !== __webpack_hash__;
}

// webpack disallows updates in other states.
function canApplyUpdates() {
  // @ts-ignore
  return module.hot.status() === 'idle';
}

function canAcceptErrors() {
  // NOTE: This var is injected by Webpack's DefinePlugin, and is a boolean instead of string.
  const hasReactRefresh = process.env.FAST_REFRESH;

  // @ts-ignore
  const status = module.hot.status();
  // React refresh can handle hot-reloading over errors.
  // However, when hot-reload status is abort or fail,
  // it indicates the current update cannot be applied safely,
  // and thus we should bail out to a forced reload for consistency.
  return hasReactRefresh && ['abort', 'fail'].indexOf(status) === -1;
}

// Attempt to update code on the fly, fall back to a hard reload.
// @ts-ignore
function tryApplyUpdates(onHotUpdateSuccess) {
  // @ts-ignore
  if (!module.hot) {
    // HotModuleReplacementPlugin is not in webpack configuration.
    console.error('HotModuleReplacementPlugin is not in Webpack configuration.');
    // @ts-ignore
    window.location.reload();
    return;
  }

  if (!isUpdateAvailable() || !canApplyUpdates()) {
    return;
  }

  // @ts-ignore
  function handleApplyUpdates(err, updatedModules) {
    const hasReactRefresh = process.env.FAST_REFRESH;

    const wantsForcedReload = !updatedModules || hadRuntimeError;

    // React refresh can handle hot-reloading over runtime errors.
    if (err || (!hasReactRefresh && wantsForcedReload)) {
      if (err) {
        console.warn(
          '[Fast Refresh] performing full reload\n\n' +
            "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" +
            'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' +
            'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' +
            'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' +
            'Fast Refresh requires at least one parent function component in your React tree.'
        );
      } else if (hadRuntimeError) {
        console.warn(
          '[Fast Refresh] performing full reload because your application had an unrecoverable error'
        );
      }
      window.location.reload();
      return;
    }

    // if (!hasReactRefresh) {
    //   if (((err || hadRuntimeError) && !canAcceptErrors()) || !updatedModules) {
    //     if (err) {
    //       console.warn(
    //         '[Fast Refresh] performing full reload\n\n' +
    //           "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" +
    //           'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' +
    //           'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' +
    //           'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' +
    //           'Fast Refresh requires at least one parent function component in your React tree.'
    //       );
    //     } else if (hadRuntimeError) {
    //       console.warn(
    //         '[Fast Refresh] performing full reload because your application had an unrecoverable error'
    //       );
    //     }
    //     // @ts-ignore
    //     window.location.reload();
    //     return;
    //   }
    // }

    const hasUpdates = Boolean(updatedModules?.length);
    if (typeof onHotUpdateSuccess === 'function') {
      // Maybe we want to do something.
      onHotUpdateSuccess(hasUpdates);
    }

    if (isUpdateAvailable()) {
      // While we were updating, there was a new update! Do it again.
      tryApplyUpdates(hasUpdates ? undefined : onHotUpdateSuccess);
    }
  }

  // https://webpack.github.io/docs/hot-module-replacement.html#check
  // @ts-ignore
  module.hot.check(/* autoApply */ true).then(
    // @ts-ignore
    updatedModules => {
      handleApplyUpdates(null, updatedModules);
    },
    // @ts-ignore
    err => {
      handleApplyUpdates(err, null);
    }
  );
}
