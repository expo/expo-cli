/**
 * @flow
 */

import 'instapromise';

import ProgressBar from 'progress';
import _ from 'lodash-node';
import bunyan from 'bunyan';
import crayon from '@ccheever/crayon';
import glob from 'glob';
import path from 'path';
import simpleSpinner from '@exponent/simple-spinner';
import url from 'url';

import program, { Command } from 'commander';
import {
  Analytics,
  Binaries,
  Config,
  Doctor,
  Logger,
  PackagerLogsStream,
  NotificationCode,
  ProjectUtils,
  User as UserManager,
} from 'xdl';

import { loginOrRegisterIfLoggedOut } from './accounts';
import log from './log';
import update from './update';
import urlOpts from './urlOpts';

if (process.env.NODE_ENV === 'development') {
  require('source-map-support').install();
}

Command.prototype.urlOpts = function() {
  urlOpts.addOptions(this);
  return this;
};

Command.prototype.allowOffline = function() {
  this.option('--offline', 'Allows this command to run while offline');
  return this;
};

Command.prototype.allowNonInteractive = function() {
  this.option(
    '--non-interactive',
    'Fails if an interactive prompt would be required to continue.'
  );
  return this;
};

Command.prototype.asyncAction = function(asyncFn, skipUpdateCheck) {
  return this.action(async (...args) => {
    if (!skipUpdateCheck) {
      try {
        await checkForUpdateAsync();
      } catch (e) {}
    }

    try {
      let options = _.last(args);
      if (options.output === 'raw') {
        log.config.raw = true;
      }
      if (options.offline) {
        Config.offline = true;
      }
      await asyncFn(...args);
    } catch (err) {
      if (err._isCommandError) {
        log.error(err.message);
      } else if (err._isApiError) {
        log.error(crayon.red(err.message));
      } else if (err.isXDLError) {
        log.error(err.message);
      } else {
        log.error(err.message);
        crayon.gray.error(err.stack);
      }
      process.exit(1);
    }
  });
};

Command.prototype.asyncActionProjectDir = function(
  asyncFn,
  skipProjectValidation,
  skipAuthCheck
) {
  return this.asyncAction(
    async (projectDir, ...args) => {
      try {
        await checkForUpdateAsync();
      } catch (e) {}

      const opts = args[0];
      if (!skipAuthCheck && !opts.nonInteractive && !opts.offline) {
        await loginOrRegisterIfLoggedOut();
      }

      if (!skipAuthCheck) {
        await UserManager.ensureLoggedInAsync();
      }

      if (!projectDir) {
        projectDir = process.cwd();
      } else {
        projectDir = path.resolve(process.cwd(), projectDir);
      }

      const logLines = (msg, logFn) => {
        for (let line of msg.split('\n')) {
          logFn(line);
        }
      };

      const logWithLevel = chunk => {
        if (!chunk.msg) {
          return;
        }
        if (chunk.level <= bunyan.INFO) {
          logLines(chunk.msg, log);
        } else if (chunk.level === bunyan.WARN) {
          logLines(chunk.msg, log.warn);
        } else {
          logLines(chunk.msg, log.error);
        }
      };

      let bar;
      let packagerLogsStream = new PackagerLogsStream({
        projectRoot: projectDir,
        onStartBuildBundle: () => {
          bar = new ProgressBar('Building JavaScript bundle [:bar] :percent', {
            total: 100,
            clear: true,
            complete: '=',
            incomplete: ' ',
          });

          log.setBundleProgressBar(bar);
        },
        onProgressBuildBundle: percent => {
          if (!bar || bar.complete) return;
          let ticks = percent - bar.curr;
          ticks > 0 && bar.tick(ticks);
        },
        onFinishBuildBundle: (err) => {
          if (bar && !bar.complete) {
            bar.tick(100 - bar.curr);
          }

          if (bar) {
            log.setBundleProgressBar(null);
            bar = null;

            if (err) {
              log(crayon.red('Failed building JavaScript bundle.'));
            } else {
              log(crayon.green('Finished building JavaScript bundle.'));
            }
          }
        },
        updateLogs: updater => {
          let newLogChunks = updater([]);
          newLogChunks.forEach(newLogChunk => {
            logWithLevel(newLogChunk);
          });
        },
      });

      // needed for validation logging to function
      ProjectUtils.attachLoggerStream(projectDir, {
        stream: {
          write: chunk => {
            if (chunk.tag === 'device') {
              logWithLevel(chunk);
            }
          },
        },
        type: 'raw',
      });

      // the existing CLI modules only pass one argument to this function, so skipProjectValidation
      // will be undefined in most cases. we can explicitly pass a truthy value here to avoid validation (eg for init)
      if (!skipProjectValidation) {
        log('Making sure project is set up correctly...');
        simpleSpinner.start();
        // validate that this is a good projectDir before we try anything else
        let status = await Doctor.validateLowLatencyAsync(projectDir);
        if (status === Doctor.FATAL) {
          throw new Error(
            `Invalid project directory. See above logs for information.`
          );
        }
        simpleSpinner.stop();
        log('Your project looks good!');
      }

      return asyncFn(projectDir, ...args);
    },
    true
  );
};

function runAsync() {
  try {
    Analytics.setSegmentNodeKey('vGu92cdmVaggGA26s3lBX6Y5fILm8SQ7');
    Analytics.setVersionName(require('../package.json').version);
    _registerLogs();

    if (process.env.SERVER_URL) {
      let serverUrl = process.env.SERVER_URL;
      if (!serverUrl.startsWith('http')) {
        serverUrl = `http://${serverUrl}`;
      }
      let parsedUrl = url.parse(serverUrl);
      Config.api.host = parsedUrl.hostname;
      Config.api.port = parsedUrl.port;
    }

    Config.developerTool = 'exp';

    program.name = 'exp';
    program
      .version(require('../package.json').version)
      .option('-o, --output [format]', 'Output format. pretty (default), raw');
    glob
      .sync('commands/*.js', {
        cwd: __dirname,
      })
      .forEach(file => {
        const commandModule = require(`./${file}`);
        if (typeof commandModule === 'function') {
          commandModule(program);
        } else if (typeof commandModule.default === 'function') {
          commandModule.default(program);
        } else {
          log.error(`'${file}.js' is not a properly formatted command.`);
        }
      });

    if (process.env.EXPO_DEBUG) {
      glob
        .sync('debug_commands/*.js', {
          cwd: __dirname,
        })
        .forEach(file => {
          require(`./${file}`)(program);
        });
    }

    program.parse(process.argv);

    let subCommand = process.argv[2];
    if (subCommand) {
      let commands = [];
      program.commands.forEach(command => {
        commands.push(command['_name']);
        let alias = command['_alias'];
        if (alias) {
          commands.push(alias);
        }
      });
      if (!_.includes(commands, subCommand)) {
        console.log(
          `"${subCommand}" is not an exp command. See "exp --help" for the full list of commands.`
        );
      }
    } else {
      program.help();
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function checkForUpdateAsync() {
  let { state, current, latest } = await update.checkForExpUpdateAsync();
  let message;
  switch (state) {
    case 'up-to-date':
      break;

    case 'out-of-date':
      message = `There is a new version of exp available (${latest}).
You are currently using exp ${current}
Run \`npm install -g exp\` to get the latest version`;
      crayon.green.error(message);
      break;

    case 'ahead-of-published':
      // if the user is ahead of npm, we're going to assume they know what they're doing
      break;

    default:
      log.error('Confused about what version of exp you have?');
  }
}

function _registerLogs() {
  let stream = {
    stream: {
      write: chunk => {
        if (chunk.code) {
          switch (chunk.code) {
            case NotificationCode.START_LOADING:
              simpleSpinner.start();
              return;
            case NotificationCode.STOP_LOADING:
              simpleSpinner.stop();
              return;
            case NotificationCode.DOWNLOAD_CLI_PROGRESS:
              return;
          }
        }

        if (chunk.level === bunyan.INFO) {
          log(chunk.msg);
        } else if (chunk.level === bunyan.WARN) {
          log.warn(chunk.msg);
        } else if (chunk.level >= bunyan.ERROR) {
          log.error(chunk.msg);
        }
      },
    },
    type: 'raw',
  };

  Logger.notifications.addStream(stream);
  Logger.global.addStream(stream);
}

async function writePathAsync() {
  let subCommand = process.argv[2];
  if (subCommand === 'prepare-detached-build') {
    // This is being run from Android Studio or Xcode. Don't want to write PATH in this case.
    return;
  }

  await Binaries.writePathToUserSettingsAsync();
}

export function run() {
  (async function() {
    await Promise.all([writePathAsync(), runAsync()]);
  })().catch(e => {
    console.error('Uncaught Error', e);
    process.exit(1);
  });
}
