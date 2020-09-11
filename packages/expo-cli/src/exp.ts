import bunyan from '@expo/bunyan';
import * as ConfigUtils from '@expo/config';
import simpleSpinner from '@expo/simple-spinner';
import {
  Analytics,
  Api,
  ApiV2,
  Binaries,
  Config,
  Doctor,
  LogRecord,
  LogUpdater,
  Logger,
  NotificationCode,
  PackagerLogsStream,
  Project,
  ProjectUtils,
  UserManager,
} from '@expo/xdl';
import boxen from 'boxen';
import chalk from 'chalk';
import program, { Command, Option } from 'commander';
import fs from 'fs';
import getenv from 'getenv';
import leven from 'leven';
import findLastIndex from 'lodash/findLastIndex';
import ora from 'ora';
import path from 'path';
import ProgressBar from 'progress';
import stripAnsi from 'strip-ansi';
import url from 'url';

import { loginOrRegisterAsync } from './accounts';
import { registerCommands } from './commands';
import log from './log';
import update from './update';
import urlOpts from './urlOpts';

// We use require() to exclude package.json from TypeScript's analysis since it lives outside the
// src directory and would change the directory structure of the emitted files under the build
// directory
const packageJSON = require('../package.json');

Api.setClientName(packageJSON.version);
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
  // Break a sentence by the word after a max character count
  return input.replace(/(.{1,72})(?:\n|$| )/g, '$1\n').trim();
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

      // Remove alias. We still show this with --help on the command.
      const alias = null; //cmd._alias;

      const description = cmd._description;
      return [
        cmd._name +
          (alias ? '|' + alias : '') +
          // Remove the redundant [options] string that's shown after every command.
          // (cmd.options.length ? ' [options]' : '') +
          (args ? ' ' + args : ''),
        breakSentence(description),
        cmd.__helpGroup ?? 'misc',
      ];
    });
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

  const groupOrder = [
    ...new Set([
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

  // Render everything.
  return [
    '' + chalk.bold('Commands:'),
    '',
    // Render all of the groups.
    Object.keys(sortedGroups)
      .map(groupName => {
        // Sort subgroups that have a defined order
        const group = sortSubGroupWithOrder(groupName, helpGroups[groupName]);
        return (
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
        );
      })
      // Double new line to add spacing between groups
      .join('\n\n'),
    '',
  ].join('\n');
};

program.on('--help', () => {
  log(`  Run a command with --help for more info 💡`);
  log(`    $ expo start --help`);
  log();
});

export type Action = (...args: any[]) => void;

// asyncAction is a wrapper for all commands/actions to be executed after commander is done
// parsing the command input
Command.prototype.asyncAction = function (asyncFn: Action, skipUpdateCheck: boolean) {
  return this.action(async (...args: any[]) => {
    if (!skipUpdateCheck) {
      try {
        await checkCliVersionAsync();
      } catch (e) {}
    }

    try {
      const options = args[args.length - 1];
      if (options.offline) {
        Config.offline = true;
      }

      await asyncFn(...args);
      // After a command, flush the analytics queue so the program will not have any active timers
      // This allows node js to exit immediately
      Analytics.flush();
    } catch (err) {
      // TODO: Find better ways to consolidate error messages
      if (err.isCommandError) {
        log.error(err.message);
      } else if (err._isApiError) {
        log.error(chalk.red(err.message));
      } else if (err.isXDLError) {
        log.error(err.message);
      } else {
        log.error(err.message);
        log.error(chalk.gray(err.stack));
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
Command.prototype.asyncActionProjectDir = function (
  asyncFn: Action,
  options: { checkConfig?: boolean; skipSDKVersionRequirement?: boolean } = {}
) {
  this.option('--config [file]', 'Specify a path to app.json or app.config.js');
  return this.asyncAction(async (projectDir: string, ...args: any[]) => {
    const opts = args[0];

    if (!projectDir) {
      projectDir = process.cwd();
    } else {
      projectDir = path.resolve(process.cwd(), projectDir);
    }

    if (opts.config) {
      const pathToConfig = path.resolve(process.cwd(), opts.config);
      if (!fs.existsSync(pathToConfig)) {
        throw new Error(`File at provided config path does not exist: ${pathToConfig}`);
      }
      ConfigUtils.setCustomConfigPath(projectDir, pathToConfig);
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
      log.addNewLineIfNone();
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

    const logWithLevel = (chunk: LogRecord) => {
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

    let bar: ProgressBar | null;
    // eslint-disable-next-line no-new
    new PackagerLogsStream({
      projectRoot: projectDir,
      onStartBuildBundle: () => {
        bar = new ProgressBar('Building JavaScript bundle [:bar] :percent', {
          width: 64,
          total: 100,
          clear: true,
          complete: '=',
          incomplete: ' ',
        });

        log.setBundleProgressBar(bar);
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
          log.setBundleProgressBar(null);
          bar.terminate();
          bar = null;

          if (err) {
            log(chalk.red('Failed building JavaScript bundle.'));
          } else {
            log(
              chalk.green(
                `Finished building JavaScript bundle in ${
                  endTime.getTime() - startTime.getTime()
                }ms.`
              )
            );
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
    ProjectUtils.attachLoggerStream(projectDir, {
      stream: {
        write: (chunk: LogRecord) => {
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
    if (options.checkConfig && (await Project.currentStatus(projectDir)) !== 'running') {
      const spinner = ora('Making sure project is set up correctly...').start();
      log.setSpinner(spinner);
      // validate that this is a good projectDir before we try anything else

      const status = await Doctor.validateWithoutNetworkAsync(projectDir, {
        skipSDKVersionRequirement: options.skipSDKVersionRequirement,
      });
      if (status === Doctor.FATAL) {
        throw new Error(`There is an error with your project. See above logs for information.`);
      }
      spinner.stop();
      log.setSpinner(null);
    }

    // the existing CLI modules only pass one argument to this function, so skipProjectValidation
    // will be undefined in most cases. we can explicitly pass a truthy value here to avoid validation (eg for init)

    return asyncFn(projectDir, ...args);
  });
};

function runAsync(programName: string) {
  try {
    // Setup analytics
    Analytics.setSegmentNodeKey('vGu92cdmVaggGA26s3lBX6Y5fILm8SQ7');
    Analytics.setVersionName(packageJSON.version);
    _registerLogs();

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

    Config.developerTool = packageJSON.name;

    // Setup our commander instance
    program.name(programName);
    program
      .version(packageJSON.version)
      .option('--non-interactive', 'Fail, if an interactive prompt would be required to continue.');

    // Load each module found in ./commands by 'registering' it with our commander instance
    registerCommands(program);

    program.on('command:detach', () => {
      log.warn('To eject your project to ExpoKit (previously "detach"), use `expo eject`.');
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
      log.warn(msg);
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
    log.error(e);
    throw e;
  }
}

async function checkCliVersionAsync() {
  const { updateIsAvailable, current, latest, deprecated } = await update.checkForUpdateAsync();
  if (updateIsAvailable) {
    log.nestedWarn(
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
    log.nestedWarn(
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
  const subCommand = process.argv[2];
  if (subCommand === 'prepare-detached-build') {
    // This is being run from Android Studio or Xcode. Don't want to write PATH in this case.
    return;
  }

  await Binaries.writePathToUserSettingsAsync();
}

type OptionData = {
  flags: string;
  required: boolean;
  description: string;
  default: any;
};

type CommandData = {
  name: string;
  description: string;
  alias?: string;
  options: OptionData[];
};

// Sets up commander with a minimal setup for inspecting commands and extracting
// data from them.
function generateCommandJSON() {
  program.name('expo');
  registerCommands(program);
  return program.commands.map(commandAsJSON);
}

// The type definition for Option seems to be wrong - doesn't include defaultValue
function optionAsJSON(option: Option & { defaultValue: any }): OptionData {
  return {
    flags: option.flags,
    required: option.required,
    description: option.description,
    default: option.defaultValue,
  };
}

function commandAsJSON(command: Command): CommandData {
  return {
    name: command.name(),
    description: command.description(),
    alias: command.alias(),
    options: command.options.map(optionAsJSON),
  };
}

function sanitizeFlags(flags: string) {
  return flags.replace('<', '[').replace('>', ']');
}

function formatOptionAsMarkdown(option: OptionData) {
  return `| \`${sanitizeFlags(option.flags)}\` | ${option.description} |`;
}

function formatOptionsAsMarkdown(options: OptionData[]) {
  if (!options || !options.length) {
    return 'This command does not take any options.';
  }

  return `| Option         | Description             |
| ------------ | ----------------------- |
${options.map(formatOptionAsMarkdown).join('\n')}
`;
}

function formatCommandAsMarkdown(command: CommandData) {
  return `
<details><summary><h3>expo ${command.name}</h3><p>${command.description}</p></summary>
<p>${
    command.alias
      ? `

Alias: \`expo ${command.alias}\``
      : ''
  }

${formatOptionsAsMarkdown(command.options)}

</p>
</details>
  `;
}

function formatCommandsAsMarkdown(commands: CommandData[]) {
  return commands.map(formatCommandAsMarkdown).join('\n');
}

// This is the entry point of the CLI
export function run(programName: string) {
  (async function () {
    if (process.argv[2] === 'introspect') {
      const commands = generateCommandJSON();
      if (process.argv[3] && process.argv[3].includes('markdown')) {
        log(formatCommandsAsMarkdown(commands));
      } else {
        log(JSON.stringify(commands));
      }
    } else {
      await Promise.all([writePathAsync(), runAsync(programName)]);
    }
  })().catch(e => {
    log.error('Uncaught Error', e);
    process.exit(1);
  });
}
