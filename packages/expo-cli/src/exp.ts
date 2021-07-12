import bunyan from '@expo/bunyan';
import { setCustomConfigPath } from '@expo/config';
import { INTERNAL_CALLSITES_REGEX } from '@expo/metro-config';
import boxen from 'boxen';
import chalk from 'chalk';
import program, { Command } from 'commander';
import fs from 'fs';
import getenv from 'getenv';
import leven from 'leven';
import findLastIndex from 'lodash/findLastIndex';
import path from 'path';
import ProgressBar from 'progress';
import stripAnsi from 'strip-ansi';
import url from 'url';
import wrapAnsi from 'wrap-ansi';
import {
  Analytics,
  ApiV2,
  Binaries,
  Config,
  ConnectionStatus,
  Doctor,
  Logger,
  LogRecord,
  LogUpdater,
  NotificationCode,
  PackagerLogsStream,
  ProjectSettings,
  ProjectUtils,
  UnifiedAnalytics,
  UserManager,
} from 'xdl';

import { AbortCommandError, SilentError } from './CommandError';
import StatusEventEmitter from './StatusEventEmitter';
import { loginOrRegisterAsync } from './accounts';
import { registerCommands } from './commands';
import { learnMore } from './commands/utils/TerminalLink';
import { profileMethod } from './commands/utils/profileMethod';
import Log from './log';
import update from './update';
import urlOpts from './urlOpts';
import { matchFileNameOrURLFromStackTrace } from './utils/matchFileNameOrURLFromStackTrace';
import { logNewSection, ora } from './utils/ora';

// We use require() to exclude package.json from TypeScript's analysis since it lives outside the
// src directory and would change the directory structure of the emitted files under the build
// directory
const packageJSON = require('../package.json');

ApiV2.setClientName(packageJSON.version);

// The following prototyped functions are not used here, but within in each file found in `./commands`
// Extending commander to easily add more options to certain command line arguments
Command.prototype.urlOpts = function () {
  urlOpts.addOptions(this);
  return this;
};

Command.prototype.allowOffline = function () {
  this.option('--offline', 'Allows this command to run while offline');
  return this;
};

// Add support for logical command groupings
Command.prototype.helpGroup = function (name: string) {
  if (this.commands[this.commands.length - 1]) {
    this.commands[this.commands.length - 1].__helpGroup = name;
  } else {
    this.parent.helpGroup(name);
  }
  return this;
};

// A longer description that will be displayed then the command is used with --help
Command.prototype.longDescription = function (name: string) {
  if (this.commands[this.commands.length - 1]) {
    this.commands[this.commands.length - 1].__longDescription = name;
  } else {
    this.parent.longDescription(name);
  }
  return this;
};

function pad(str: string, width: number): string {
  // Pulled from commander for overriding
  const len = Math.max(0, width - stripAnsi(str).length);
  return str + Array(len + 1).join(' ');
}

function humanReadableArgName(arg: any): string {
  // Pulled from commander for overriding
  const nameOutput = arg.name + (arg.variadic === true ? '...' : '');
  return arg.required ? `<${nameOutput}>` : `[${nameOutput}]`;
}

function breakSentence(input: string): string {
  // Break a sentence by the word after a max character count, adjusting for ansi characters
  return wrapAnsi(input, 72);
}

Command.prototype.prepareCommands = function () {
  return this.commands
    .filter(function (cmd: Command) {
      // Display all commands with EXPO_DEBUG, otherwise use the noHelp option.
      if (getenv.boolish('EXPO_DEBUG', false)) {
        return true;
      }
      return !['internal', 'eas'].includes(cmd.__helpGroup);
    })
    .map(function (cmd: Command, i: number) {
      const args = cmd._args.map(humanReadableArgName).join(' ');

      const description = cmd._description;
      // Remove alias. We still show this with --help on the command.
      // const alias = cmd._alias;
      // const nameWithAlias = cmd._name + (alias ? '|' + alias : '');
      const nameWithAlias = cmd._name;
      return [
        nameWithAlias +
          // Remove the redundant [options] string that's shown after every command.
          // (cmd.options.length ? ' [options]' : '') +
          (args ? ' ' + args : ''),
        breakSentence(description),
        cmd.__helpGroup ?? 'misc',
      ];
    });
};

/**
 * Set / get the command usage `str`.
 *
 * @param {String} str
 * @return {String|Command}
 * @api public
 */

// @ts-ignore
Command.prototype.usage = function (str: string) {
  const args = this._args.map(function (arg: any[]) {
    return humanReadableArgName(arg);
  });

  const commandsStr = this.commands.length ? '[command]' : '';
  const argsStr = this._args.length ? args.join(' ') : '';

  let usage = commandsStr + argsStr;
  if (usage.length) usage += ' ';
  usage += '[options]';

  if (arguments.length === 0) {
    return this._usage || usage;
  }
  this._usage = str;

  return this;
};

Command.prototype.helpInformation = function () {
  let desc: string[] = [];
  // Use the long description if available, otherwise use the regular description.
  const description = this.__longDescription ?? this._description;
  if (description) {
    desc = [replaceAll(breakSentence(description), '\n', pad('\n', 3)), ''];

    const argsDescription = this._argsDescription;
    if (argsDescription && this._args.length) {
      const width = this.padWidth();
      desc.push('Arguments:');
      desc.push('');
      this._args.forEach(({ name }: { name: string }) => {
        desc.push('  ' + pad(name, width) + '  ' + argsDescription[name]);
      });
      desc.push('');
    }
  }

  let cmdName = this._name;
  if (this._alias) {
    // Here is the only place we show the command alias
    cmdName = `${cmdName}|${this._alias}`;
  }

  // Dim the options to keep things consistent.
  const usage = `${chalk.bold`Usage:`} ${cmdName} ${chalk.dim(this.usage())}\n`;

  const commandHelp = '' + this.commandHelp();

  const options = [chalk.bold`Options:`, '\n' + this.optionHelp().replace(/^/gm, '    '), ''];

  // return ['', usage, ...desc, ...options, commandHelp].join('\n') + '\n';
  return ['', usage, ...desc, ...options, commandHelp].join(pad('\n', 3)) + '\n';
};

function replaceAll(string: string, search: string, replace: string): string {
  return string.split(search).join(replace);
}

export const helpGroupOrder = [
  'auth',
  'core',
  'client',
  'info',
  'publish',
  'build',
  'credentials',
  'eas',
  'notifications',
  'url',
  'webhooks',
  'upload',
  'eject',
  'experimental',
  'internal',
];

function sortHelpGroups(helpGroups: Record<string, string[][]>): Record<string, string[][]> {
  const groupOrder = [
    ...new Set([
      ...helpGroupOrder,
      // add any others and remove duplicates
      ...Object.keys(helpGroups),
    ]),
  ];

  const subGroupOrder: Record<string, string[]> = {
    core: ['init', 'start', 'start:web', 'publish', 'export'],
    eas: ['eas:credentials'],
  };

  const sortSubGroupWithOrder = (groupName: string, group: string[][]): string[][] => {
    const order: string[] = subGroupOrder[groupName];
    if (!order?.length) {
      return group;
    }

    const sortedCommands: string[][] = [];

    while (order.length) {
      const key = order.shift()!;
      const index = group.findIndex(item => item[0].startsWith(key));
      if (index >= 0) {
        const [item] = group.splice(index, 1);
        sortedCommands.push(item);
      }
    }

    return sortedCommands.concat(group);
  };

  // Reverse the groups
  const sortedGroups: Record<string, string[][]> = {};
  while (groupOrder.length) {
    const group = groupOrder.shift()!;
    if (group in helpGroups) {
      sortedGroups[group] = helpGroups[group];
    }
  }

  return Object.keys(sortedGroups).reduce(
    (prev, curr) => ({
      ...prev,
      // Sort subgroups that have a defined order
      [curr]: sortSubGroupWithOrder(curr, helpGroups[curr]),
    }),
    {}
  );
}

// Extended the help renderer to add a custom format and groupings.
Command.prototype.commandHelp = function () {
  if (!this.commands.length) {
    return '';
  }
  const width: number = this.padWidth();
  const commands: string[][] = this.prepareCommands();

  const helpGroups: Record<string, string[][]> = {};

  // Sort commands into helpGroups
  for (const command of commands) {
    const groupName = command[2];
    if (!helpGroups[groupName]) {
      helpGroups[groupName] = [];
    }
    helpGroups[groupName].push(command);
  }

  const sorted = sortHelpGroups(helpGroups);

  // Render everything.
  return [
    '' + chalk.bold('Commands:'),
    '',
    // Render all of the groups.
    Object.values(sorted)
      .map(group =>
        group
          // Render the command and description
          .map(([cmd, description]: string[]) => {
            // Dim the arguments that come after the command, this makes scanning a bit easier.
            let [noArgsCmd, ...noArgsCmdArgs] = cmd.split(' ');
            if (noArgsCmdArgs.length) {
              noArgsCmd += ` ${chalk.dim(noArgsCmdArgs.join(' '))}`;
            }

            // Word wrap the description.
            let wrappedDescription = description;
            if (description) {
              // Ensure the wrapped description appears on the same padded line.
              wrappedDescription = '  ' + replaceAll(description, '\n', pad('\n', width + 3));
            }

            const paddedName = wrappedDescription ? pad(noArgsCmd, width) : noArgsCmd;
            return paddedName + wrappedDescription;
          })
          .join('\n')
          .replace(/^/gm, '    ')
      )
      // Double new line to add spacing between groups
      .join('\n\n'),
    '',
  ].join('\n');
};

program.on('--help', () => {
  Log.log(`  Run a command with --help for more info 💡`);
  Log.log(`    $ expo start --help`);
  Log.log();
});

export type Action = (...args: any[]) => void;

// asyncAction is a wrapper for all commands/actions to be executed after commander is done
// parsing the command input
Command.prototype.asyncAction = function (asyncFn: Action) {
  return this.action(async (...args: any[]) => {
    if (process.env.EAS_BUILD !== '1') {
      try {
        await profileMethod(checkCliVersionAsync)();
      } catch (e) {}
    }

    try {
      const options = args[args.length - 1];
      if (options.offline) {
        ConnectionStatus.setIsOffline(true);
      }

      await asyncFn(...args);
      // After a command, flush the analytics queue so the program will not have any active timers
      // This allows node js to exit immediately
      Analytics.flush();
      UnifiedAnalytics.flush();
    } catch (err) {
      // TODO: Find better ways to consolidate error messages
      if (err instanceof AbortCommandError || err instanceof SilentError) {
        // Do nothing when a prompt is cancelled or the error is logged in a pretty way.
      } else if (err.isCommandError) {
        Log.error(err.message);
      } else if (err._isApiError) {
        Log.error(chalk.red(err.message));
      } else if (err.isXDLError) {
        Log.error(err.message);
      } else if (err.isJsonFileError || err.isConfigError || err.isPackageManagerError) {
        if (err.code === 'EJSONEMPTY') {
          // Empty JSON is an easy bug to debug. Often this is thrown for package.json or app.json being empty.
          Log.error(err.message);
        } else {
          Log.addNewLineIfNone();
          Log.error(err.message);
          const stacktrace = formatStackTrace(err.stack, this.name());
          Log.error(chalk.gray(stacktrace));
        }
      } else {
        Log.error(err.message);
        Log.error(chalk.gray(err.stack));
      }

      process.exit(1);
    }
  });
};

function getStringBetweenParens(value: string): string {
  const regExp = /\(([^)]+)\)/;
  const matches = regExp.exec(value);
  if (matches && matches?.length > 1) {
    return matches[1];
  }
  return value;
}

function focusLastPathComponent(value: string): string {
  const parts = value.split('/');
  if (parts.length > 1) {
    const last = parts.pop();
    const current = chalk.dim(parts.join('/') + '/');
    return `${current}${last}`;
  }
  return chalk.dim(value);
}

function formatStackTrace(stacktrace: string, command: string): string {
  const treeStackLines: string[][] = [];
  for (const line of stacktrace.split('\n')) {
    const [first, ...parts] = line.trim().split(' ');
    // Remove at -- we'll use a branch instead.
    if (first === 'at') {
      treeStackLines.push(parts);
    }
  }

  return treeStackLines
    .map((parts, index) => {
      let first = parts.shift();
      let last = parts.pop();

      // Replace anonymous with command name
      if (first === 'Command.<anonymous>') {
        first = chalk.bold(`expo ${command}`);
      } else if (first?.startsWith('Object.')) {
        // Remove extra JS types from function names
        first = first.split('Object.').pop()!;
      } else if (first?.startsWith('Function.')) {
        // Remove extra JS types from function names
        first = first.split('Function.').pop()!;
      } else if (first?.startsWith('/')) {
        // If the first element is a path
        first = focusLastPathComponent(getStringBetweenParens(first));
      }

      if (last) {
        last = focusLastPathComponent(getStringBetweenParens(last));
      }
      const branch = (index === treeStackLines.length - 1 ? '└' : '├') + '─';
      return ['   ', branch, first, ...parts, last].filter(Boolean).join(' ');
    })
    .join('\n');
}

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
Command.prototype.asyncActionProjectDir = function (
  asyncFn: Action,
  options: { checkConfig?: boolean; skipSDKVersionRequirement?: boolean } = {}
) {
  this.option(
    '--config [file]',
    `${chalk.yellow('Deprecated:')} Use app.config.js to switch config files instead.`
  );
  return this.asyncAction(async (projectRoot: string, ...args: any[]) => {
    const opts = args[0];

    if (!projectRoot) {
      projectRoot = process.cwd();
    } else {
      projectRoot = path.resolve(process.cwd(), projectRoot);
    }

    if (opts.config) {
      Log.log(
        chalk.yellow(
          `\u203A ${chalk.bold(
            '--config'
          )} flag is deprecated. Use app.config.js instead. ${learnMore(
            'https://expo.fyi/config-flag-migration'
          )}`
        )
      );
      Log.newLine();

      // @ts-ignore: This guards against someone passing --config without a path.
      if (opts.config === true) {
        Log.addNewLineIfNone();
        Log.log('Please specify your custom config path:');
        Log.log(
          Log.chalk.green(`  expo ${this.name()} --config ${Log.chalk.cyan(`<app-config>`)}`)
        );
        Log.newLine();
        process.exit(1);
      }

      const pathToConfig = path.resolve(process.cwd(), opts.config);
      // Warn the user when the custom config path they provided does not exist.
      if (!fs.existsSync(pathToConfig)) {
        const relativeInput = path.relative(process.cwd(), opts.config);
        const formattedPath = Log.chalk
          .reset(pathToConfig)
          .replace(relativeInput, Log.chalk.bold(relativeInput));
        Log.addNewLineIfNone();
        Log.nestedWarn(`Custom config file does not exist:\n${formattedPath}`);
        Log.newLine();
        const helpCommand = Log.chalk.green(`expo ${this.name()} --help`);
        Log.log(`Run ${helpCommand} for more info`);
        Log.newLine();
        process.exit(1);
        // throw new Error(`File at provided config path does not exist: ${pathToConfig}`);
      }
      setCustomConfigPath(projectRoot, pathToConfig);
    }

    const logLines = (msg: any, logFn: (...args: any[]) => void) => {
      if (typeof msg === 'string') {
        for (const line of msg.split('\n')) {
          logFn(line);
        }
      } else {
        logFn(msg);
      }
    };

    const logStackTrace = (
      chunk: LogRecord,
      logFn: (...args: any[]) => void,
      nestedLogFn: (...args: any[]) => void
    ) => {
      let traceInfo;
      try {
        traceInfo = JSON.parse(chunk.msg);
      } catch (e) {
        return logFn(chunk.msg);
      }

      const { message, stack } = traceInfo;
      Log.addNewLineIfNone();
      logFn(chalk.bold(message));

      const isLibraryFrame = (line: string) => {
        return line.startsWith('node_modules');
      };

      const stackFrames: string[] = stack.split('\n').filter((line: string) => line);
      const lastAppCodeFrameIndex = findLastIndex(stackFrames, (line: string) => {
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
        const line = stackFrames[i];

        if (!line) {
          continue;
        }

        let isCollapsed = false;
        const fileNameOrUrl = matchFileNameOrURLFromStackTrace(line);
        if (fileNameOrUrl) {
          // Use the same regex we use in Metro config to filter out traces:
          isCollapsed = INTERNAL_CALLSITES_REGEX.test(fileNameOrUrl);

          // Unless the user is in debug mode, skip printing the collapsed files.
          if (!Log.isDebug && isCollapsed) {
            continue;
          }
        }

        // If a file is collapsed, print it with dim styling.
        const style = isCollapsed ? chalk.dim : (message: string) => message;
        // Use the `at` prefix to match Node.js
        nestedLogFn(style('at ' + line));
      }

      if (unloggedFrames > 0) {
        nestedLogFn(`- ... ${unloggedFrames} more stack frames from framework internals`);
      }

      Log.printNewLineBeforeNextLog();
    };

    const logWithLevel = (chunk: LogRecord) => {
      if (!chunk.msg) {
        return;
      }
      if (chunk.level <= bunyan.INFO) {
        if (chunk.includesStack) {
          logStackTrace(chunk, Log.log, Log.nested);
        } else {
          logLines(chunk.msg, Log.log);
        }
      } else if (chunk.level === bunyan.WARN) {
        if (chunk.includesStack) {
          logStackTrace(chunk, Log.warn, Log.nestedWarn);
        } else {
          logLines(chunk.msg, Log.warn);
        }
      } else {
        if (chunk.includesStack) {
          logStackTrace(chunk, Log.error, Log.nestedError);
        } else {
          logLines(chunk.msg, Log.error);
        }
      }
    };

    let bar: ProgressBar | null;
    // eslint-disable-next-line no-new
    new PackagerLogsStream({
      projectRoot,
      onStartBuildBundle: () => {
        // TODO: Unify with commands/utils/progress.ts
        bar = new ProgressBar('Building JavaScript bundle [:bar] :percent', {
          width: 64,
          total: 100,
          clear: true,
          complete: '=',
          incomplete: ' ',
        });

        Log.setBundleProgressBar(bar);
      },
      onProgressBuildBundle: (percent: number) => {
        if (!bar || bar.complete) return;
        const ticks = percent - bar.curr;
        ticks > 0 && bar.tick(ticks);
      },
      onFinishBuildBundle: (err, startTime, endTime) => {
        if (bar && !bar.complete) {
          bar.tick(100 - bar.curr);
        }

        if (bar) {
          Log.setBundleProgressBar(null);
          bar.terminate();
          bar = null;

          if (err) {
            Log.log(chalk.red('Failed building JavaScript bundle.'));
          } else {
            const totalBuildTimeMs = endTime.getTime() - startTime.getTime();
            Log.log(chalk.green(`Finished building JavaScript bundle in ${totalBuildTimeMs}ms.`));
            StatusEventEmitter.emit('bundleBuildFinish', { totalBuildTimeMs });
          }
        }
      },
      updateLogs: (updater: LogUpdater) => {
        const newLogChunks = updater([]);
        newLogChunks.forEach((newLogChunk: LogRecord) => {
          if (newLogChunk.issueId && newLogChunk.issueCleared) {
            return;
          }
          logWithLevel(newLogChunk);
        });
      },
    });

    // needed for validation logging to function
    ProjectUtils.attachLoggerStream(projectRoot, {
      stream: {
        write: (chunk: LogRecord) => {
          if (chunk.tag === 'device') {
            logWithLevel(chunk);
            StatusEventEmitter.emit('deviceLogReceive', {
              deviceId: chunk.deviceId,
              deviceName: chunk.deviceName,
            });
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
    if (
      options.checkConfig &&
      (await ProjectSettings.getCurrentStatusAsync(projectRoot)) !== 'running'
    ) {
      const spinner = ora('Making sure project is set up correctly...').start();
      Log.setSpinner(spinner);
      // validate that this is a good projectDir before we try anything else

      const status = await Doctor.validateWithoutNetworkAsync(projectRoot, {
        skipSDKVersionRequirement: options.skipSDKVersionRequirement,
      });
      if (status === Doctor.FATAL) {
        throw new Error(`There is an error with your project. See above logs for information.`);
      }
      spinner.stop();
      Log.setSpinner(null);
    }

    // the existing CLI modules only pass one argument to this function, so skipProjectValidation
    // will be undefined in most cases. we can explicitly pass a truthy value here to avoid validation (eg for init)

    return asyncFn(projectRoot, ...args);
  });
};

export async function bootstrapAnalyticsAsync(): Promise<void> {
  Analytics.initializeClient('vGu92cdmVaggGA26s3lBX6Y5fILm8SQ7', packageJSON.version);
  UnifiedAnalytics.initializeClient('u4e9dmCiNpwIZTXuyZPOJE7KjCMowdx5', packageJSON.version);

  const userData = await profileMethod(
    UserManager.getCachedUserDataAsync,
    'getCachedUserDataAsync'
  )();

  if (!userData?.userId) return;

  UnifiedAnalytics.identifyUser(userData.userId, {
    userId: userData.userId,
    currentConnection: userData?.currentConnection,
    username: userData?.username,
    userType: '', // not available without hitting api
  });
}

export function trackUsage(commands: Command[] = []) {
  const input = process.argv[2];
  const ExpoCommand = (cmd: Command): boolean =>
    (cmd._name === input || cmd._alias === input) && input !== undefined;
  const subCommand = commands.find(ExpoCommand)?._name;

  if (!subCommand) return; // only track valid expo commands

  UnifiedAnalytics.logEvent('action', {
    action: `expo ${subCommand}`,
    source: 'expo cli',
    source_version: UnifiedAnalytics.version,
  });
}

async function runAsync(programName: string) {
  try {
    _registerLogs();

    await bootstrapAnalyticsAsync();
    UserManager.setInteractiveAuthenticationCallback(loginOrRegisterAsync);

    if (process.env.SERVER_URL) {
      let serverUrl = process.env.SERVER_URL;
      if (!serverUrl.startsWith('http')) {
        serverUrl = `http://${serverUrl}`;
      }
      const parsedUrl = url.parse(serverUrl);
      const port = parseInt(parsedUrl.port || '', 10);
      if (parsedUrl.hostname && port) {
        Config.api.host = parsedUrl.hostname;
        Config.api.port = port;
      } else {
        throw new Error('Environment variable SERVER_URL is not a valid url');
      }
    }

    // Setup our commander instance
    program.name(programName);
    program
      .version(packageJSON.version)
      .option('--non-interactive', 'Fail, if an interactive prompt would be required to continue.');

    // Load each module found in ./commands by 'registering' it with our commander instance
    profileMethod(registerCommands)(program);

    trackUsage(program.commands); // must be after register commands

    program.on('command:detach', () => {
      Log.warn('To eject your project to ExpoKit (previously "detach"), use `expo eject`.');
      process.exit(0);
    });

    program.on('command:*', subCommand => {
      let msg = `"${subCommand}" is not an expo command. See "expo --help" for the full list of commands.`;
      const availableCommands = program.commands.map((cmd: Command) => cmd._name);
      // finding the best match whose edit distance is less than 40% of their length.
      const suggestion = availableCommands.find(
        (commandName: string) => leven(commandName, subCommand[0]) < commandName.length * 0.4
      );
      if (suggestion) {
        msg = `"${subCommand}" is not an expo command -- did you mean ${suggestion}?\n See "expo --help" for the full list of commands.`;
      }
      Log.warn(msg);
    });

    if (typeof program.nonInteractive === 'undefined') {
      // Commander doesn't initialize boolean args with default values.
      program.nonInteractive = !process.stdin.isTTY;
    }

    program.parse(process.argv);

    // Show help when no sub-command specified
    if (program.args.length === 0) {
      program.help();
    }
  } catch (e) {
    Log.error(e);
    throw e;
  }
}

async function checkCliVersionAsync() {
  const { updateIsAvailable, current, latest, deprecated } = await update.checkForUpdateAsync();
  if (updateIsAvailable) {
    Log.nestedWarn(
      boxen(
        chalk.green(`There is a new version of ${packageJSON.name} available (${latest}).
You are currently using ${packageJSON.name} ${current}
Install expo-cli globally using the package manager of your choice;
for example: \`npm install -g ${packageJSON.name}\` to get the latest version`),
        { borderColor: 'green', padding: 1 }
      )
    );
  }

  if (deprecated) {
    Log.nestedWarn(
      boxen(
        chalk.red(
          `This version of expo-cli is not supported anymore.
It's highly recommended to update to the newest version.

The API endpoints used in this version of expo-cli might not exist,
any interaction with Expo servers may result in unexpected behaviour.`
        ),
        { borderColor: 'red', padding: 1 }
      )
    );
  }
}

function _registerLogs() {
  const stream = {
    stream: {
      write: (chunk: any) => {
        if (chunk.code) {
          switch (chunk.code) {
            case NotificationCode.START_PROGRESS_BAR: {
              const bar = new ProgressBar(chunk.msg, {
                width: 64,
                total: 100,
                clear: true,
                complete: '=',
                incomplete: ' ',
              });
              Log.setBundleProgressBar(bar);
              return;
            }
            case NotificationCode.TICK_PROGRESS_BAR: {
              const spinner = Log.getProgress();
              if (spinner) {
                spinner.tick(1, chunk.msg);
              }
              return;
            }
            case NotificationCode.STOP_PROGRESS_BAR: {
              const spinner = Log.getProgress();
              if (spinner) {
                spinner.terminate();
              }
              return;
            }
            case NotificationCode.START_LOADING:
              logNewSection(chunk.msg || '');
              return;
            case NotificationCode.STOP_LOADING: {
              const spinner = Log.getSpinner();
              if (spinner) {
                spinner.stop();
              }
              return;
            }
            case NotificationCode.DOWNLOAD_CLI_PROGRESS:
              return;
          }
        }

        if (chunk.level === bunyan.INFO) {
          Log.log(chunk.msg);
        } else if (chunk.level === bunyan.WARN) {
          Log.warn(chunk.msg);
        } else if (chunk.level >= bunyan.ERROR) {
          Log.error(chunk.msg);
        }
      },
    },
    type: 'raw',
  };

  Logger.notifications.addStream(stream);
  Logger.global.addStream(stream);
}

async function writePathAsync() {
  const subCommand = process.argv[2];
  if (subCommand === 'prepare-detached-build') {
    // This is being run from Android Studio or Xcode. Don't want to write PATH in this case.
    return;
  }

  await Binaries.writePathToUserSettingsAsync();
}

// This is the entry point of the CLI
export function run(programName: string) {
  (async function () {
    await Promise.all([writePathAsync(), runAsync(programName)]);
  })().catch(e => {
    Log.error('Uncaught Error', e);
    process.exit(1);
  });
}
