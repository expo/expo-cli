import path from 'path';

import chalk from 'chalk';
import getenv from 'getenv';
import idx from 'idx';
import { JSONObject } from '@expo/json-file';

import * as ProjectUtils from '../project/ProjectUtils';
import Logger from '../Logger';

type BuildEventType =
  | 'METRO_INITIALIZE_STARTED'
  | 'BUILD_STARTED'
  | 'BUILD_PROGRESS'
  | 'BUILD_FAILED'
  | 'BUILD_DONE';
type MetroLogRecord = {
  tag: 'metro';
  id: string;
  shouldHide: boolean;
  msg: ReportableEvent | string;
  level: number;
  _metroEventType?: BuildEventType;
};
type ExpoLogRecord = {
  tag: 'expo';
  id: string;
  shouldHide: boolean;
  msg: any;
  level: number;
};
type DeviceLogRecord = {
  tag: 'device';
  id: string;
  shouldHide: boolean;
  msg: any;
  level: number;
};
export type LogRecord = (MetroLogRecord | ExpoLogRecord | DeviceLogRecord) & ProjectUtils.LogFields;

export type LogUpdater = (logState: Array<LogRecord>) => Array<LogRecord>;

type ErrorObject = {
  name?: string;
  stack?: string;
  message?: string;
  code?: string;
} & JSONObject;

type MetroError =
  | {
      originModulePath: string;
      message: string;
      errors: Array<Object>;
    } & ErrorObject
  | {
      type: 'TransformError';
      snippet: string;
      lineNumber: number;
      column: number;
      filename: string;
      errors: Array<Object>;
    } & ErrorObject
  | ErrorObject;

// Metro reporter types
// https://github.com/facebook/metro/blob/2a327fb19dd62169ab3ae9069011d8a599cfcf3e/packages/metro/src/lib/reporting.js
type GlobalCacheDisabledReason = 'too_many_errors' | 'too_many_misses';
type BundleDetails = {
  entryFile: string;
  platform: string;
  dev: boolean;
  minify: boolean;
  bundleType: string;
};
type ReportableEvent =
  | {
      port: number | undefined;
      projectRoots: ReadonlyArray<string>;
      type: 'initialize_started';
    }
  | {
      type: 'initialize_done';
    }
  | {
      type: 'initialize_failed';
      port: number;
      error: MetroError;
    }
  | {
      buildID: string;
      type: 'bundle_build_done';
    }
  | {
      buildID: string;
      type: 'bundle_build_failed';
    }
  | {
      buildID: string;
      bundleDetails: BundleDetails;
      type: 'bundle_build_started';
    }
  | {
      error: MetroError;
      type: 'bundling_error';
    }
  | {
      type: 'dep_graph_loading';
    }
  | {
      type: 'dep_graph_loaded';
    }
  | {
      buildID: string;
      type: 'bundle_transform_progressed';
      transformedFileCount: number;
      totalFileCount: number;
    }
  | {
      type: 'global_cache_error';
      error: MetroError;
    }
  | {
      type: 'global_cache_disabled';
      reason: GlobalCacheDisabledReason;
    }
  | {
      type: 'transform_cache_reset';
    }
  | {
      type: 'worker_stdout_chunk';
      chunk: string;
    }
  | {
      type: 'worker_stderr_chunk';
      chunk: string;
    }
  | {
      type: 'hmr_client_error';
      error: MetroError;
    };

type StartBuildBundleCallback = (chunk: LogRecord) => void;
type ProgressBuildBundleCallback = (progress: number, start: Date | null, chunk: any) => void;
type FinishBuildBundleCallback = (
  error: string | null,
  start: Date,
  end: Date,
  chunk: MetroLogRecord
) => void;

export default class PackagerLogsStream {
  _projectRoot: string;
  _getCurrentOpenProjectId: () => any;
  _updateLogs: (updater: LogUpdater) => void;
  _logsToAdd: Array<LogRecord> = [];
  _bundleBuildChunkID: string | null = null;
  _onStartBuildBundle?: StartBuildBundleCallback;
  _onProgressBuildBundle?: ProgressBuildBundleCallback;
  _onFinishBuildBundle?: FinishBuildBundleCallback;
  _bundleBuildStart: Date | null = null;
  _getSnippetForError?: (error: MetroError) => string | null;

  constructor({
    projectRoot,
    getCurrentOpenProjectId,
    updateLogs,
    onStartBuildBundle,
    onProgressBuildBundle,
    onFinishBuildBundle,
    getSnippetForError,
  }: {
    projectRoot: string;
    getCurrentOpenProjectId?: () => any;
    updateLogs: (updater: LogUpdater) => void;
    onStartBuildBundle?: StartBuildBundleCallback;
    onProgressBuildBundle?: ProgressBuildBundleCallback;
    onFinishBuildBundle?: FinishBuildBundleCallback;
    getSnippetForError?: (error: MetroError) => string | null;
  }) {
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
        write: (chunk: LogRecord) => {
          if (chunk.tag !== 'metro' && chunk.tag !== 'expo') {
            return;
          } else if (this._getCurrentOpenProjectId() !== projectId) {
            // TODO: We should be confident that we are properly unsubscribing
            // from the stream rather than doing a defensive check like this.
            return;
          }

          chunk = this._maybeParseMsgJSON(chunk);
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

  _handleMetroEvent(originalChunk: MetroLogRecord) {
    const chunk = { ...originalChunk };
    let { msg } = chunk;

    if (typeof msg === 'string') {
      if ((msg as string).includes('HTTP/1.1') && !getenv.boolish('EXPO_DEBUG', false)) {
        // Do nothing with this message - we want to filter out network requests logged by Metro.
      } else {
        // If Metro crashes for some reason, it may log an error message as a plain string to stderr.
        this._enqueueAppendLogChunk(chunk);
      }
      return;
    }
    switch (msg.type) {
      // Bundle transform events
      case 'bundle_build_started':
      case 'bundle_transform_progressed':
      case 'bundle_build_failed':
      case 'bundle_build_done':
        this._handleBundleTransformEvent(chunk);
        return;

      case 'initialize_started':
        chunk._metroEventType = 'METRO_INITIALIZE_STARTED';
        chunk.msg = msg.port
          ? `Starting Metro Bundler on port ${msg.port}.`
          : 'Starting Metro Bundler.';
        break;
      case 'initialize_done':
        chunk.msg = `Metro Bundler ready.`;
        break;
      case 'initialize_failed': {
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
          this._formatModuleResolutionError(msg.error) ||
          this._formatBundlingError(msg.error) ||
          msg;
        chunk.level = Logger.ERROR;
        break;
      case 'transform_cache_reset':
        chunk.msg =
          'Your JavaScript transform cache is empty, rebuilding (this may take a minute).';
        break;
      case 'hmr_client_error':
        chunk.msg = `A WebSocket client got a connection error. Please reload your device to get HMR working again.`;
        break;
      case 'global_cache_disabled':
        if (msg.reason === 'too_many_errors') {
          chunk.msg =
            'The global cache is now disabled because it has been failing too many times.';
        } else if (msg.reason === 'too_many_misses') {
          chunk.msg = `The global cache is now disabled because it has been missing too many consecutive keys.`;
        } else {
          chunk.msg = `The global cache is now disabled. Reason: ${msg.reason}`;
        }
        break;
      case 'worker_stdout_chunk':
        chunk.msg = this._formatWorkerChunk('stdout', msg.chunk);
        break;
      case 'worker_stderr_chunk':
        chunk.msg = this._formatWorkerChunk('stderr', msg.chunk);
        break;
      // Ignored events.
      case 'dep_graph_loading':
      case 'dep_graph_loaded':
      case 'global_cache_error':
        return;
      default:
        chunk.msg = `Unrecognized event: ${JSON.stringify(msg)}`;
        break;
    }
    this._enqueueAppendLogChunk(chunk);
  }

  // Any event related to bundle building is handled here
  _handleBundleTransformEvent = (chunk: MetroLogRecord) => {
    const msg = chunk.msg as ReportableEvent;

    if (msg.type === 'bundle_build_started') {
      chunk._metroEventType = 'BUILD_STARTED';
      this._handleNewBundleTransformStarted(chunk);
    } else if (msg.type === 'bundle_transform_progressed') {
      chunk._metroEventType = 'BUILD_PROGRESS';
      if (this._bundleBuildChunkID) {
        this._handleUpdateBundleTransformProgress(chunk);
      } else {
        this._handleNewBundleTransformStarted(chunk);
      }
    } else if (msg.type === 'bundle_build_failed') {
      chunk._metroEventType = 'BUILD_FAILED';
      if (!this._bundleBuildChunkID) {
        // maybe?
      } else {
        this._handleUpdateBundleTransformProgress(chunk);
      }
    } else if (msg.type === 'bundle_build_done') {
      chunk._metroEventType = 'BUILD_DONE';
      if (!this._bundleBuildChunkID) {
        // maybe?
      } else {
        this._handleUpdateBundleTransformProgress(chunk);
      }
    }
  };

  _handleNewBundleTransformStarted(chunk: MetroLogRecord) {
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

  _handleUpdateBundleTransformProgress(progressChunk: MetroLogRecord) {
    const msg = progressChunk.msg as ReportableEvent;

    let percentProgress;
    let bundleComplete = false;

    if (msg.type === 'bundle_build_done') {
      percentProgress = 100;
      bundleComplete = true;
      if (this._bundleBuildStart) {
        const duration = new Date().getTime() - this._bundleBuildStart.getTime();
        progressChunk.msg = `Building JavaScript bundle: finished in ${duration}ms.`;
      } else {
        progressChunk.msg = `Building JavaScript bundle: finished.`;
      }
    } else if (msg.type === 'bundle_build_failed') {
      percentProgress = -1;
      bundleComplete = true;
      progressChunk.msg = `Building JavaScript bundle: error`;
      progressChunk.level = Logger.ERROR;
    } else if (msg.type === 'bundle_transform_progressed') {
      percentProgress = Math.floor((msg.transformedFileCount / msg.totalFileCount) * 100);
      progressChunk.msg = `Building JavaScript bundle: ${percentProgress}%`;
    } else {
      return;
    }

    if (this._bundleBuildChunkID) {
      progressChunk.id = this._bundleBuildChunkID;
    }

    if (this._onProgressBuildBundle) {
      this._onProgressBuildBundle(percentProgress, this._bundleBuildStart, progressChunk);

      if (bundleComplete) {
        if (this._onFinishBuildBundle && this._bundleBuildStart) {
          const error = msg.type === 'bundle_build_failed' ? 'Build failed' : null;
          this._onFinishBuildBundle(error, this._bundleBuildStart, new Date(), progressChunk);
        }
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

  _formatModuleResolutionError(error: MetroError): string | null {
    if (!error.message) {
      return null;
    }
    const match = /^Unable to resolve module `(.+?)`/.exec(error.message);
    const originModulePath = error.originModulePath as (string | null);
    if (!match || !originModulePath) {
      return null;
    }
    const moduleName = match[1];
    const relativePath = path.relative(this._projectRoot, originModulePath);

    const DOCS_PAGE_URL =
      'https://docs.expo.io/versions/latest/introduction/faq/#can-i-use-nodejs-packages-with-expo';

    if (NODE_STDLIB_MODULES.includes(moduleName)) {
      if (originModulePath.includes('node_modules')) {
        return `The package at "${relativePath}" attempted to import the Node standard library module "${moduleName}". It failed because React Native does not include the Node standard library. Read more at ${DOCS_PAGE_URL}`;
      } else {
        return `You attempted attempted to import the Node standard library module "${moduleName}" from "${relativePath}". It failed because React Native does not include the Node standard library. Read more at ${DOCS_PAGE_URL}`;
      }
    }
    return `Unable to resolve "${moduleName}" from "${relativePath}"`;
  }

  _formatBundlingError(error: MetroError): string | null {
    let message = error.message;
    if (!message && Array.isArray(error.errors) && error.errors.length) {
      message = (error.errors[0] as any).description;
    }
    if (!message) {
      return null;
    }

    message = chalk.red(message);

    let snippet = (this._getSnippetForError && this._getSnippetForError(error)) || error.snippet;
    if (snippet) {
      message += `\n${snippet}`;
    }
    return message;
  }

  _formatWorkerChunk(origin: 'stdout' | 'stderr', chunk: string) {
    const lines = chunk.split('\n');
    if (lines.length >= 1 && lines[lines.length - 1] === '') {
      lines.splice(lines.length - 1, 1);
    }
    return lines.map(line => `transform[${origin}]: ${line}`).join('\n');
  }

  _enqueueAppendLogChunk(chunk: LogRecord) {
    if (!chunk.shouldHide) {
      this._logsToAdd.push(chunk);
      this._enqueueFlushLogsToAdd();
    }
  }

  _enqueueFlushLogsToAdd = () => {
    this._updateLogs(logs => {
      if (this._logsToAdd.length === 0) {
        return logs;
      }

      let nextLogs = logs.concat(this._logsToAdd);
      this._logsToAdd = [];
      return nextLogs;
    });
  };

  _maybeParseMsgJSON(chunk: LogRecord) {
    try {
      let parsedMsg = JSON.parse(chunk.msg);
      chunk.msg = parsedMsg;
    } catch (e) {
      // non-JSON message
    }

    return chunk;
  }

  _cleanUpNodeErrors = (chunk: LogRecord) => {
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
