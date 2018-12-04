/**
 * @flow
 */

import ProgressBar from 'progress';
import _ from 'lodash';
import bunyan from '@expo/bunyan';
import chalk from 'chalk';
import glob from 'glob';
import fs from 'fs';
import path from 'path';
import simpleSpinner from '@expo/simple-spinner';
import url from 'url';
import getenv from 'getenv';

import program, { Command } from 'commander';
import {
  Analytics,
  Binaries,
  Config,
  Doctor,
  Logger,
  PackagerLogsStream,
  NotificationCode,
  Project,
  ProjectUtils,
  User as UserManager,
} from 'xdl';

import { loginOrRegisterIfLoggedOut } from './accounts';
import log from './log';
import update from './update';
import urlOpts from './urlOpts';
import addCommonOptions from './commonOptions';
import packageJSON from '../package.json';

// The following prototyped functions are not used here, but within in each file found in `./commands`
// Extending commander to easily add more options to certain command line arguments
Command.prototype.urlOpts = function() {
  urlOpts.addOptions(this);
  return this;
};

Command.prototype.allowOffline = function() {
  this.option('--offline', 'Allows this command to run while offline');
  return this;
};

// asyncAction is a wrapper for all commands/actions to be executed after commander is done
// parsing the command input
Command.prototype.asyncAction = function(asyncFn, skipUpdateCheck) {
  addCommonOptions(this);
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
      // After a command, flush the analytics queue so the program will not have any active timers
      // This allows node js to exit immediately
      Analytics.flush();
    } catch (err) {
      // TODO: Find better ways to consolidate error messages
      if (err._isCommandError) {
        log.error(err.message);
      } else if (err._isApiError) {
        log.error(chalk.red(err.message));
      } else if (err.isXDLError) {
        log.error(err.message);
      } else {
        log.error(err.message);
        // TODO: Is there a better way to do this? EXPO_DEBUG needs to be set to view the stack trace
        if (getenv.boolish('EXPO_DEBUG', false)) {
          log.error(chalk.gray(err.stack));
        } else {
          log.error(chalk.grey('Set EXPO_DEBUG=true in your env to view the stack trace.'));
        }
      }

      process.exit(1);
    }
  });
};

// asyncActionProjectDir captures the projectDirectory from the command line,
// setting it to cwd if it is not provided.
// Commands such as `start` and `publish` use this.
// It does several things:
// - Everything in asyncAction
// - Checks if the user is logged in or out
// - Checks for updates
// - Attaches the bundling logger
// - Checks if the project directory is valid or not
// - Runs AsyncAction with the projectDir as an argument
Command.prototype.asyncActionProjectDir = function(asyncFn, skipProjectValidation, skipAuthCheck) {
  return this.asyncAction(async (projectDir, ...args) => {
    const opts = args[0];

    if (!projectDir) {
      projectDir = process.cwd();
    } else {
      projectDir = path.resolve(process.cwd(), projectDir);
    }

    if (opts.config) {
      const pathToConfig = path.resolve(process.cwd(), opts.config);
      if (!fs.existsSync(pathToConfig)) {
        throw new Error(`File at provide config path does not exist: ${pathToConfig}`);
      }
      ProjectUtils.setCustomConfigPath(projectDir, pathToConfig);
    }

    const logLines = (msg, logFn) => {
      if (typeof msg === 'string') {
        for (let line of msg.split('\n')) {
          logFn(line);
        }
      } else {
        logFn(msg);
      }
    };

    const logStackTrace = (chunk, logFn, nestedLogFn) => {
      let traceInfo;
      try {
        traceInfo = JSON.parse(chunk.msg);
      } catch (e) {
        return logFn(chunk.msg);
      }

      let { message, stack } = traceInfo;
      log.addNewLineIfNone();
      logFn(chalk.bold(message));

      const isLibraryFrame = line => {
        return line.startsWith('node_modules');
      };

      let stackFrames = _.compact(stack.split('\n'));
      let lastAppCodeFrameIndex = _.findLastIndex(stackFrames, line => {
        return !isLibraryFrame(line);
      });
      let lastFrameIndexToLog = Math.min(
        stackFrames.length - 1,
        lastAppCodeFrameIndex + 2 // show max two more frames after last app code frame
      );
      let unloggedFrames = stackFrames.length - lastFrameIndexToLog;

      // If we're only going to exclude one frame, just log them all
      if (unloggedFrames === 1) {
        lastFrameIndexToLog = stackFrames.length - 1;
        unloggedFrames = 0;
      }

      for (let i = 0; i <= lastFrameIndexToLog; i++) {
        let line = stackFrames[i];
        if (!line) {
          continue;
        } else if (line.match(/react-native\/.*YellowBox.js/)) {
          continue;
        }

        if (line.startsWith('node_modules')) {
          nestedLogFn('- ' + line);
        } else {
          nestedLogFn('* ' + line);
        }
      }

      if (unloggedFrames > 0) {
        nestedLogFn(`- ... ${unloggedFrames} more stack frames from framework internals`);
      }

      log.printNewLineBeforeNextLog();
    };

    const logWithLevel = chunk => {
      if (!chunk.msg) {
        return;
      }
      if (chunk.level <= bunyan.INFO) {
        if (chunk.includesStack) {
          logStackTrace(chunk, log, log.nested);
        } else {
          logLines(chunk.msg, log);
        }
      } else if (chunk.level === bunyan.WARN) {
        if (chunk.includesStack) {
          logStackTrace(chunk, log.warn, log.nestedWarn);
        } else {
          logLines(chunk.msg, log.warn);
        }
      } else {
        if (chunk.includesStack) {
          logStackTrace(chunk, log.error, log.nestedError);
        } else {
          logLines(chunk.msg, log.error);
        }
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
      onFinishBuildBundle: (err, startTime: Date, endTime: Date) => {
        if (bar && !bar.complete) {
          bar.tick(100 - bar.curr);
        }

        if (bar) {
          log.setBundleProgressBar(null);
          bar = null;

          if (err) {
            log(chalk.red('Failed building JavaScript bundle.'));
          } else {
            log(chalk.green(`Finished building JavaScript bundle in ${endTime - startTime}ms.`));
          }
        }
      },
      updateLogs: updater => {
        let newLogChunks = updater([]);
        newLogChunks.forEach(newLogChunk => {
          if (newLogChunk.issueId && newLogChunk.issueCleared) {
            return;
          }
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

    // The existing CLI modules only pass one argument to this function, so skipProjectValidation
    // will be undefined in most cases. we can explicitly pass a truthy value here to avoid
    // validation (eg for init)
    //
    // If the packager/manifest server is running and healthy, there is no need
    // to rerun Doctor because the directory was already checked previously
    // This is relevant for command such as `send`
    if (!skipProjectValidation && (await Project.currentStatus(projectDir)) !== 'running') {
      log('Making sure project is set up correctly...');
      simpleSpinner.start();
      // validate that this is a good projectDir before we try anything else

      let status = await Doctor.validateLowLatencyAsync(projectDir);
      if (status === Doctor.FATAL) {
        throw new Error(`There is an error with your project. See above logs for information.`);
      }
      simpleSpinner.stop();
      log('Your project looks good!');
    }

    // the existing CLI modules only pass one argument to this function, so skipProjectValidation
    // will be undefined in most cases. we can explicitly pass a truthy value here to avoid validation (eg for init)

    return asyncFn(projectDir, ...args);
  });
};

function runAsync(programName) {
  try {
    // Setup analytics
    Analytics.setSegmentNodeKey('vGu92cdmVaggGA26s3lBX6Y5fILm8SQ7');
    Analytics.setVersionName(packageJSON.version);
    _registerLogs();

    UserManager.setInteractiveAuthenticationCallback(loginOrRegisterIfLoggedOut);

    if (process.env.SERVER_URL) {
      let serverUrl = process.env.SERVER_URL;
      if (!serverUrl.startsWith('http')) {
        serverUrl = `http://${serverUrl}`;
      }
      let parsedUrl = url.parse(serverUrl);
      Config.api.host = parsedUrl.hostname;
      Config.api.port = parsedUrl.port;
    }

    Config.developerTool = packageJSON.name;

    // Setup our commander instance
    program.name = programName;
    program
      .version(packageJSON.version)
      .option('-o, --output [format]', 'Output format. pretty (default), raw')
      .option(
        '--non-interactive',
        'Fail, if an interactive prompt would be required to continue. Enabled by default if stdin is not a TTY.'
      );

    // Load each module found in ./commands by 'registering' it with our commander instance
    glob
      .sync('commands/*.js', { cwd: __dirname })
      .sort()
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

    let subCommand = process.argv[2];
    let argv = process.argv.filter(arg => {
      // Remove deprecated `--github` option here in order to fallback to password login/signup.
      if (subCommand === 'login' && arg === '--github') {
        log.nestedWarn(
          'GitHub login is not currently available.\nPlease log in with your Expo account.'
        );
        return false;
      }
      if (subCommand === 'register' && arg === '--github') {
        log.nestedWarn('GitHub sign up is not currently available.');
        return false;
      }
      return true;
    });
    program.parse(argv);

    if (typeof program.nonInteractive === 'undefined') {
      // Commander doesn't initialize boolean args with default values.
      program.nonInteractive = !process.stdin.isTTY;
    }

    // Display a message if the user does not input a valid command
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
          `"${subCommand}" is not an ${programName} command. See "${programName} --help" for the full list of commands.`
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
  let { updateIsAvailable, current, latest } = await update.checkForUpdateAsync();
  if (updateIsAvailable) {
    log.nestedWarn(
      chalk.green(`There is a new version of ${packageJSON.name} available (${latest}).
You are currently using ${packageJSON.name} ${current}
Run \`npm install -g ${packageJSON.name}\` to get the latest version`)
    );
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

// This is the entry point of the CLI
export function run(programName) {
  (async function() {
    await Promise.all([writePathAsync(), runAsync(programName)]);
  })().catch(e => {
    console.error('Uncaught Error', e);
    process.exit(1);
  });
}
