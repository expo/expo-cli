/* @flow */

import * as ProjectUtils from '../project/ProjectUtils';
import { trim } from 'lodash';
import { isNode } from '../tools/EnvironmentHelper';

type ChunkT = {
  _id: ?number,
  shouldHide: boolean,
  msg: any,
  tag: 'packager' | 'expo' | 'device',
};

type LogUpdater = (logState: Array<ChunkT>) => Array<ChunkT>;

export default class PackagerLogsStream {
  _projectRoot: string;
  _getCurrentOpenProjectId: () => any;
  _updateLogs: (updater: LogUpdater) => void;
  _logsToAdd: Array<ChunkT>;
  _chunkID: number;
  _bundleBuildChunkID: ?number;
  _onStartBuildBundle: ?Function;
  _onProgressBuildBundle: ?Function;
  _onFinishBuildBundle: ?Function;
  _onFailBuildBundle: ?Function;
  _bundleBuildStart: ?Date;

  _resetState = () => {
    this._logsToAdd = [];
    this._chunkID = 0;
  };

  constructor({
    projectRoot,
    getCurrentOpenProjectId,
    updateLogs,
    onStartBuildBundle,
    onProgressBuildBundle,
    onFinishBuildBundle,
  }: {
    projectRoot: string,
    getCurrentOpenProjectId?: () => any,
    updateLogs: (updater: LogUpdater) => void,
    onStartBuildBundle?: () => void,
    onProgressBuildBundle?: (progress: number) => void,
    onFinishBuildBundle?: () => void,
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

    this._attachLoggerStream();
  }

  _attachLoggerStream() {
    let projectId = this._getCurrentOpenProjectId();

    ProjectUtils.attachLoggerStream(this._projectRoot, {
      stream: {
        write: (chunk: any) => {
          if (chunk.tag !== 'packager' && chunk.tag !== 'expo') {
            return;
          } else if (this._getCurrentOpenProjectId() !== projectId) {
            // TODO: We should be confident that we are properly unsubscribing
            // from the stream rather than doing a defensive check like this.
            return;
          }

          chunk = this._maybeParseMsgJSON(chunk);
          chunk = this._formatMsg(chunk);
          chunk = this._cleanUpNodeErrors(chunk);
          chunk = this._attachChunkID(chunk);

          if (typeof chunk.msg === 'object' || chunk.type === 'packager') {
            this._handlePackagerEvent(chunk);
          } else if (!chunk.msg.match(/\w/) || !chunk.msg || chunk.msg[0] === '{') {
            return;
          } else {
            this._enqueueAppendLogChunk(chunk);
          }
        },
      },
      type: 'raw',
    });
  }

  // This is where we handle any special packager events
  _handlePackagerEvent = (chunk: any) => {
    let { msg } = chunk;

    if (!msg.type) {
      return;
    } else if (msg.type && msg.type.match(/^bundle_/)) {
      this._handleBundleTransformEvent(chunk);
      return;
    }

    if (msg.type === 'dep_graph_loading') {
      chunk.msg = 'Loading dependency graph.'; // doesn't seem important to log this
    } else if (msg.type == 'dep_graph_loaded') {
      chunk.msg = 'Dependency graph loaded.'; // doesn't seem important to log this
    } else if (msg.type === 'transform_cache_reset') {
      chunk.msg = 'Your JavaScript transform cache is empty, rebuilding (this may take a minute).';
    } else if (msg.type === 'initialize_packager_started') {
      chunk.msg = `Running packager on port ${msg.port}.`;
    } else {
      chunk.msg = '';
    }

    this._enqueueAppendLogChunk(chunk);
  };

  // Any event related to bundle building is handled here
  _handleBundleTransformEvent = (chunk: any) => {
    let { msg } = chunk;

    if (msg.type === 'bundle_build_started') {
      this._handleNewBundleTransformStarted(chunk);
    } else if (msg.type === 'bundle_transform_progressed') {
      this._bundleBuildChunkID
        ? this._handleUpdateBundleTransformProgress(chunk)
        : this._handleNewBundleTransformStarted(chunk);
    } else if (msg.type === 'bundle_build_failed') {
      if (!this._bundleBuildChunkID) {
        return; // maybe?
      } else {
        this._handleUpdateBundleTransformProgress(chunk);
      }
    } else if (msg.type === 'bundle_build_done') {
      if (!this._bundleBuildChunkID) {
        return; // maybe?
      } else {
        this._handleUpdateBundleTransformProgress(chunk);
      }
    } else {
      // Unrecognized bundle_* message!
    }
  };

  _handleNewBundleTransformStarted = (chunk: any) => {
    if (this._bundleBuildChunkID) {
      return;
    }

    this._bundleBuildChunkID = chunk._id;
    this._bundleBuildStart = new Date();
    chunk.msg = 'Building JavaScript bundle';

    if (this._onStartBuildBundle) {
      this._onStartBuildBundle();
    } else {
      this._enqueueAppendLogChunk(chunk);
    }
  };

  _handleUpdateBundleTransformProgress = (progressChunk: any) => {
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

    if (this._onProgressBuildBundle) {
      this._onProgressBuildBundle(percentProgress);

      if (bundleComplete) {
        this._onFinishBuildBundle &&
          this._onFinishBuildBundle(bundleError, this._bundleBuildStart, bundleBuildEnd);
        this._bundleBuildStart = null;
        this._bundleBuildChunkID = null;
      }
    } else {
      this._updateLogs(logs => {
        if (!logs || !logs.length) {
          return [];
        }

        logs.forEach(log => {
          if (log._id === this._bundleBuildChunkID) {
            if (percentProgress === -1) {
              log.msg = `Building JavaScript bundle: error\n${msg.error.description ||
                msg.error.message}`;
            } else {
              if (bundleComplete) {
                let duration;
                if (this._bundleBuildStart) {
                  duration = bundleBuildEnd - this._bundleBuildStart;
                }

                if (duration) {
                  log.msg = `Building JavaScript bundle: finished in ${duration}ms.`;
                } else {
                  log.msg = `Building JavaScript bundle: finished.`;
                }
              } else {
                log.msg = `Building JavaScript bundle: ${percentProgress}%`;
              }
            }
          }
        });

        if (bundleComplete) {
          this._bundleBuildChunkID = null;
        }

        return [...logs];
      });
    }
  };

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

  _attachChunkID(chunk: any) {
    this._chunkID++;
    chunk._id = this._chunkID;
    return chunk;
  }

  _maybeParseMsgJSON(chunk: any) {
    try {
      let parsedMsg = JSON.parse(chunk.msg);
      chunk.msg = parsedMsg;
    } catch (e) {
      // Fallback to the <= SDK 15 version of formatting logs
      let msg = this._legacyFormatter(chunk);
      chunk.msg = msg;
    }

    return chunk;
  }

  _legacyFormatter = (chunk: ChunkT) => {
    if (typeof chunk.msg === 'object') {
      return chunk;
    }

    if (chunk.msg.match(/Transforming modules/)) {
      let progress = chunk.msg.match(/\d+\.\d+% \(\d+\/\d+\)/);
      if (progress && progress[0]) {
        chunk.msg = `Transforming modules: ${progress[0]}`;
      }
    }

    return chunk.msg;
  };

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
  _formatMsg(chunk: any) {
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
