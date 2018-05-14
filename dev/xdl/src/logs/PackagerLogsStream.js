/* @flow */
import path from 'path';
import escapeStringRegexp from 'escape-string-regexp';

import * as ProjectUtils from '../project/ProjectUtils';
import Logger from '../Logger';
import { trim } from 'lodash';
import { isNode } from '../tools/EnvironmentHelper';

type ChunkT =
  | {
      tag: 'expo' | 'device',
      id: string,
      shouldHide: boolean,
      msg: any,
      level: number,
    }
  | {
      tag: 'metro',
      id: string,
      shouldHide: boolean,
      msg: ReportableEvent,
      level: number,
    };

type LogUpdater = (logState: Array<ChunkT>) => Array<ChunkT>;

type Error =
  | {
      originModulePath: string,
      message: string,
      errors: Array<Object>,
    }
  | {
      type: 'TransformError',
      snippet: string,
      lineNumber: number,
      column: number,
      filename: string,
      errors: Array<Object>,
    };

// Metro reporter types
// https://github.com/facebook/metro/blob/2a327fb19dd62169ab3ae9069011d8a599cfcf3e/packages/metro/src/lib/reporting.js
type GlobalCacheDisabledReason = 'too_many_errors' | 'too_many_misses';
type BundleDetails = {
  entryFile: string,
  platform: string,
  dev: boolean,
  minify: boolean,
  bundleType: string,
};
type ReportableEvent =
  | {
      port: ?number,
      // $FlowFixMe: $ReadOnlyArray not recognized
      projectRoots: $ReadOnlyArray<string>,
      type: 'initialize_started',
    }
  | {
      type: 'initialize_done',
    }
  | {
      type: 'initialize_failed',
      port: number,
      error: Error,
    }
  | {
      buildID: string,
      type: 'bundle_build_done',
    }
  | {
      buildID: string,
      type: 'bundle_build_failed',
    }
  | {
      buildID: string,
      bundleDetails: BundleDetails,
      type: 'bundle_build_started',
    }
  | {
      error: Error,
      type: 'bundling_error',
    }
  | {
      type: 'dep_graph_loading',
    }
  | {
      type: 'dep_graph_loaded',
    }
  | {
      buildID: string,
      type: 'bundle_transform_progressed',
      transformedFileCount: number,
      totalFileCount: number,
    }
  | {
      type: 'global_cache_error',
      error: Error,
    }
  | {
      type: 'global_cache_disabled',
      reason: GlobalCacheDisabledReason,
    }
  | {
      type: 'transform_cache_reset',
    }
  | {
      type: 'worker_stdout_chunk',
      chunk: string,
    }
  | {
      type: 'worker_stderr_chunk',
      chunk: string,
    }
  | {
      type: 'hmr_client_error',
      error: Error,
    };

export default class PackagerLogsStream {
  _projectRoot: string;
  _getCurrentOpenProjectId: () => any;
  _updateLogs: (updater: LogUpdater) => void;
  _logsToAdd: Array<ChunkT>;
  _bundleBuildChunkID: ?number;
  _onStartBuildBundle: ?Function;
  _onProgressBuildBundle: ?Function;
  _onFinishBuildBundle: ?Function;
  _onFailBuildBundle: ?Function;
  _getSnippetForError: ?(error: Error) => ?string;
  _bundleBuildStart: ?Date;

  _resetState = () => {
    this._logsToAdd = [];
  };

  constructor({
    projectRoot,
    getCurrentOpenProjectId,
    updateLogs,
    onStartBuildBundle,
    onProgressBuildBundle,
    onFinishBuildBundle,
    getSnippetForError,
  }: {
    projectRoot: string,
    getCurrentOpenProjectId?: () => any,
    updateLogs: (updater: LogUpdater) => void,
    onStartBuildBundle?: (chunk: any) => void,
    onProgressBuildBundle?: (progress: number, start: Date, chunk: any) => void,
    onFinishBuildBundle?: (error: ?string, start: ?Date, end: Date, chunk: any) => void,
    getSnippetForError?: (error: Error) => ?string,
  }) {
    this._resetState();
    this._projectRoot = projectRoot;
    this._getCurrentOpenProjectId = getCurrentOpenProjectId || (() => 1);
    this._updateLogs = updateLogs;

    // Optional properties in case the consumer wants to handle updates on
    // its own, eg: for a progress bar
    this._onStartBuildBundle = onStartBuildBundle;
    this._onProgressBuildBundle = onProgressBuildBundle;
    this._onFinishBuildBundle = onFinishBuildBundle;

    // Optional function for creating custom code frame snippet
    // (e.g. with terminal colors) from a syntax error.
    this._getSnippetForError = getSnippetForError;

    this._attachLoggerStream();
  }

  _attachLoggerStream() {
    let projectId = this._getCurrentOpenProjectId();

    ProjectUtils.attachLoggerStream(this._projectRoot, {
      stream: {
        write: chunk => {
          if (chunk.tag !== 'metro' && chunk.tag !== 'expo') {
            return;
          } else if (this._getCurrentOpenProjectId() !== projectId) {
            // TODO: We should be confident that we are properly unsubscribing
            // from the stream rather than doing a defensive check like this.
            return;
          }

          chunk = this._maybeParseMsgJSON(chunk);
          chunk = this._formatMsg(chunk);
          chunk = this._cleanUpNodeErrors(chunk);
          if (chunk.tag === 'metro') {
            this._handleMetroEvent(chunk);
          } else if (
            typeof chunk.msg === 'string' &&
            chunk.msg.match(/\w/) &&
            chunk.msg[0] !== '{'
          ) {
            this._enqueueAppendLogChunk(chunk);
          }
        },
      },
      type: 'raw',
    });
  }

  _handleMetroEvent(originalChunk: ChunkT) {
    const chunk = { ...originalChunk };
    let { msg } = chunk;
    if (typeof msg === 'string') {
      // If Metro crashes for some reason, it may log an error message as a plain string to stderr.
      this._enqueueAppendLogChunk(chunk);
      return;
    }
    if (/^bundle_/.test(msg.type)) {
      this._handleBundleTransformEvent(chunk);
      return;
    }
    switch (msg.type) {
      case 'initialize_started': // SDK >=23 (changed in Metro v0.17.0)
      case 'initialize_packager_started': // SDK <=22
        chunk._metroEventType = 'METRO_INITIALIZE_STARTED';
        chunk.msg = msg.port
          ? `Starting Metro Bundler on port ${msg.port}.`
          : 'Starting Metro Bundler.';
        break;
      case 'initialize_done': // SDK >=23 (changed in Metro v0.17.0)
      case 'initialize_packager_done': // SDK <=22
        chunk.msg = `Metro Bundler ready.`;
        break;
      case 'initialize_failed': // SDK >=23 (changed in Metro v0.17.0)
      case 'initialize_packager_failed': {
        // SDK <=22
        // $FlowFixMe
        let code = msg.error.code;
        chunk.msg =
          code === 'EADDRINUSE'
            ? `Metro Bundler can't listen on port ${msg.port}. The port is in use.`
            : `Metro Bundler failed to start. (code: ${code})`;
        break;
      }
      case 'bundling_error':
        chunk.msg =
          this._formatModuleResolutionError(msg.error) || this._formatBundlingError(msg.error);
        chunk.level = Logger.ERROR;
        break;
      case 'transform_cache_reset':
        chunk.msg =
          'Your JavaScript transform cache is empty, rebuilding (this may take a minute).';
        break;
      case 'hmr_client_error':
        chunk.msg = `A WebSocket client got a connection error. Please reload your device to get HMR working again.`;
        break;
      // Ignored events.
      case 'dep_graph_loading':
      case 'dep_graph_loaded':
      case 'global_cache_disabled':
      case 'global_cache_error':
      case 'worker_stdout_chunk':
      case 'worker_stderr_chunk':
        return;
      default:
        chunk.msg = `Unrecognized event: ${msg.type}`;
        chunk.level = Logger.DEBUG;
        break;
    }
    this._enqueueAppendLogChunk(chunk);
  }

  // Any event related to bundle building is handled here
  _handleBundleTransformEvent = (chunk: any) => {
    let { msg } = chunk;

    if (msg.type === 'bundle_build_started') {
      chunk._metroEventType = 'BUILD_STARTED';
      this._handleNewBundleTransformStarted(chunk);
    } else if (msg.type === 'bundle_transform_progressed') {
      chunk._metroEventType = 'BUILD_PROGRESS';
      this._bundleBuildChunkID
        ? this._handleUpdateBundleTransformProgress(chunk)
        : this._handleNewBundleTransformStarted(chunk);
    } else if (msg.type === 'bundle_build_failed') {
      chunk._metroEventType = 'BUILD_FAILED';
      if (!this._bundleBuildChunkID) {
        return; // maybe?
      } else {
        this._handleUpdateBundleTransformProgress(chunk);
      }
    } else if (msg.type === 'bundle_build_done') {
      chunk._metroEventType = 'BUILD_DONE';
      if (!this._bundleBuildChunkID) {
        return; // maybe?
      } else {
        this._handleUpdateBundleTransformProgress(chunk);
      }
    } else {
      // Unrecognized bundle_* message!
      console.log('Unrecognized bundle_* message!', msg);
    }
  };

  _handleNewBundleTransformStarted(chunk: any) {
    if (this._bundleBuildChunkID) {
      return;
    }

    this._bundleBuildChunkID = chunk.id;
    this._bundleBuildStart = new Date();
    chunk.msg = 'Building JavaScript bundle';

    if (this._onStartBuildBundle) {
      this._onStartBuildBundle(chunk);
    } else {
      this._enqueueAppendLogChunk(chunk);
    }
  }

  _handleUpdateBundleTransformProgress(progressChunk: any) {
    let { msg } = progressChunk;
    let percentProgress;
    let bundleComplete = false;
    let bundleError = false;
    let bundleBuildEnd;

    if (msg.type === 'bundle_build_done') {
      percentProgress = 100;
      bundleComplete = true;
      bundleBuildEnd = new Date();
    } else if (msg.type === 'bundle_build_failed') {
      percentProgress = -1;
      bundleComplete = true;
      bundleError = new Error('Failed to build bundle');
      bundleBuildEnd = new Date();
    } else {
      percentProgress = Math.floor(msg.transformedFileCount / msg.totalFileCount * 100);
    }

    if (this._bundleBuildChunkID) {
      progressChunk.id = this._bundleBuildChunkID;
    }
    if (bundleError) {
      progressChunk.msg = `Building JavaScript bundle: error`;
      if (msg.error) {
        progressChunk.msg += '\n' + (msg.error.description || msg.error.message);
      }
    } else {
      if (bundleComplete) {
        let duration;
        if (this._bundleBuildStart) {
          duration = bundleBuildEnd - this._bundleBuildStart;
        }

        if (duration) {
          progressChunk.msg = `Building JavaScript bundle: finished in ${duration}ms.`;
        } else {
          progressChunk.msg = `Building JavaScript bundle: finished.`;
        }
      } else {
        progressChunk.msg = `Building JavaScript bundle: ${percentProgress}%`;
      }
    }

    if (this._onProgressBuildBundle) {
      this._onProgressBuildBundle(percentProgress, this._bundleBuildStart, progressChunk);

      if (bundleComplete) {
        this._onFinishBuildBundle &&
          this._onFinishBuildBundle(
            bundleError,
            this._bundleBuildStart,
            bundleBuildEnd,
            progressChunk
          );
        this._bundleBuildStart = null;
        this._bundleBuildChunkID = null;
      }
    } else {
      this._updateLogs(logs => {
        if (!logs || !logs.length) {
          return [];
        }

        logs.forEach(log => {
          if (log.id === this._bundleBuildChunkID) {
            log.msg = progressChunk.msg;
          }
        });

        if (bundleComplete) {
          this._bundleBuildChunkID = null;
        }

        return [...logs];
      });
    }
  }

  _formatModuleResolutionError(error: any) {
    let match = /^Unable to resolve module `(.+?)`/.exec(error.message);
    let { originModulePath } = error;
    if (!match || !originModulePath) {
      return null;
    }
    let moduleName = match[1];
    let relativePath = path.relative(this._projectRoot, originModulePath);

    const DOCS_PAGE_URL =
      'https://docs.expo.io/versions/latest/introduction/faq.html#can-i-use-nodejs-packages-with-expo';

    if (NODE_STDLIB_MODULES.includes(moduleName)) {
      if (originModulePath.includes('node_modules')) {
        return `The package at "${relativePath}" attempted to import the Node standard library module "${moduleName}". It failed because React Native does not include the Node standard library. Read more at ${DOCS_PAGE_URL}`;
      } else {
        return `You attempted attempted to import the Node standard library module "${moduleName}" from "${relativePath}". It failed because React Native does not include the Node standard library. Read more at ${DOCS_PAGE_URL}`;
      }
    }
    return `Unable to resolve "${moduleName}" from "${relativePath}"`;
  }

  _formatBundlingError(error: any) {
    let message = error.message;
    if (!message && error.errors && error.errors.length) {
      message = error.errors[0].description;
    }

    // Before metro@0.29.0 the message may include the filename twice.
    // TODO(ville): Remove this once we drop support for react-native v0.54.4 or older.
    if (message && error.filename) {
      let escapedFilename = escapeStringRegexp(error.filename);
      message = message.replace(
        new RegExp(`Error in ${escapedFilename}: ${escapedFilename}:`),
        `Error in ${error.filename}:`
      );
    }

    let snippet = (this._getSnippetForError && this._getSnippetForError(error)) || error.snippet;
    if (snippet) {
      message += `\n${snippet}`;
    }
    return message;
  }

  _enqueueAppendLogChunk(chunk: ChunkT) {
    if (chunk.shouldHide) {
      return;
    } else {
      this._logsToAdd.push(chunk);
      this._enqueueFlushLogsToAdd();
    }
  }

  _enqueueFlushLogsToAdd = () => {
    let func = () => {
      this._updateLogs(logs => {
        if (this._logsToAdd.length === 0) {
          return logs;
        }

        let nextLogs = logs.concat(this._logsToAdd);
        this._logsToAdd = [];
        return nextLogs;
      });
    };

    if (isNode()) {
      func();
    } else {
      setImmediate(func);
    }
  };

  _maybeParseMsgJSON(chunk: ChunkT) {
    try {
      let parsedMsg = JSON.parse(chunk.msg);
      chunk.msg = parsedMsg;
    } catch (e) {
      // non-JSON message
    }

    return chunk;
  }

  _cleanUpNodeErrors = (chunk: ChunkT) => {
    if (typeof chunk.msg === 'object') {
      return chunk;
    }

    if (chunk.msg.match(/\(node:.\d*\)/)) {
      // Example: (node:13817) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): SyntaxError: SyntaxError /Users/brent/universe/apps/new-project-template/main.js: Unexpected token (10:6)
      // The first part of this is totally useless, so let's remove it.
      if (chunk.msg.match(/UnhandledPromiseRejectionWarning/)) {
        chunk.msg = chunk.msg.replace(/\(node:.*\(rejection .*\):/, '');
        if (chunk.msg.match(/SyntaxError: SyntaxError/)) {
          chunk.msg = chunk.msg.replace('SyntaxError: ', '');
        }
      } else if (chunk.msg.match(/DeprecationWarning/)) {
        chunk.msg = '';
      }
    }

    return chunk;
  };

  // This message is just noise
  // Fall back to the same formatting we did on SDK <= 15 before we had a custom
  // reporter class.
  _formatMsg(chunk) {
    if (typeof chunk.msg === 'object') {
      return chunk;
    }

    if (chunk.msg.match(/Looking for JS files in/)) {
      chunk.msg = '';
    } else if (chunk.msg.match(/^[\u001b]/)) {
      chunk.msg = '';
    }

    chunk.msg = chunk.msg.replace(/\[\w{2}m/g, '');
    chunk.msg = chunk.msg.replace(/\[2K/g, '');
    chunk.msg = trim(chunk.msg);
    return chunk;
  }
}

const NODE_STDLIB_MODULES = [
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'path',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'zlib',
];
