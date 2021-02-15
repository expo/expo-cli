import {
  Android,
  Exp,
  Project,
  ProjectSettings,
  Prompts,
  Simulator,
  UrlUtils,
  UserManager,
  UserSettings,
  Webpack,
} from '@expo/xdl';
import chalk from 'chalk';
import openBrowser from 'react-dev-utils/openBrowser';
import wrapAnsi from 'wrap-ansi';

import { loginOrRegisterIfLoggedOutAsync } from '../../accounts';
import Log from '../../log';
import { promptEmailAsync } from '../../prompts';
import urlOpts from '../../urlOpts';
import { openInEditorAsync } from '../utils/openInEditorAsync';

const CTRL_C = '\u0003';
const CTRL_D = '\u0004';
const CTRL_L = '\u000C';

const BLT = `\u203A`;
const { bold: b, italic: i, underline: u } = chalk;

type StartOptions = {
  devClient?: boolean;
  reset?: boolean;
  nonInteractive?: boolean;
  nonPersistent?: boolean;
  maxWorkers?: number;
  webOnly?: boolean;
};

const printHelp = (): void => {
  logCommandsTable([[], ['?', 'show all commands']]);
};

const div = chalk.dim(`│`);

const printUsageAsync = async (
  projectRoot: string,
  options: Pick<StartOptions, 'webOnly'> = {}
) => {
  const { dev } = await ProjectSettings.readAsync(projectRoot);
  const openDevToolsAtStartup = await UserSettings.getAsync('openDevToolsAtStartup', true);
  const devMode = dev ? 'development' : 'production';
  const currentToggle = openDevToolsAtStartup ? 'enabled' : 'disabled';

  const isMac = process.platform === 'darwin';

  logCommandsTable([
    [],
    ['a', `open Android`],
    ['shift+a', `select a device or emulator`],
    isMac && ['i', `open iOS simulator`],
    isMac && ['shift+i', `select a simulator`],
    ['w', `open web`],
    [],
    ['o', `open project code in your editor`],
    ['c', `show project QR`],
    ['p', `toggle build mode`, devMode],
    ['r', `restart bundler`],
    ['shift+r', `restart and clear cache`],
    [],
    ['d', `open developer tools`],
    ['shift+d', `toggle auto opening developer tools on startup`, currentToggle],
    !options.webOnly && ['e', `share the app link by email`],
  ]);
};

const printBasicUsageAsync = async (options: Pick<StartOptions, 'webOnly'> = {}) => {
  const isMac = process.platform === 'darwin';
  const openDevToolsAtStartup = await UserSettings.getAsync('openDevToolsAtStartup', true);
  const currentToggle = openDevToolsAtStartup ? 'enabled' : 'disabled';

  logCommandsTable([
    [],
    ['a', `open Android`],
    isMac && ['i', `open iOS simulator`],
    ['w', `open web`],
    [],
    ['d', `open developer tools`],
    ['shift+d', `toggle auto opening developer tools on startup`, currentToggle],
    !options.webOnly && ['e', `share the app link by email`],
  ]);
};

function logCommandsTable(ui: (false | string[])[]) {
  Log.nested(
    ui
      .filter(Boolean)
      // @ts-ignore: filter doesn't work
      .map(([key, message, status]) => {
        if (!key) return '';
        let view = ` ${BLT} `;
        if (key.length === 1) view += 'Press ';
        view += `${b(key)} ${div} `;
        view += message;
        // let view = ` ${BLT} Press ${b(key)} ${div} ${message}`;
        if (status) {
          view += ` ${chalk.dim(`(${i(status)})`)}`;
        }
        return view;
      })
      .join('\n')
  );
}

const printServerInfo = async (
  projectRoot: string,
  options: Pick<StartOptions, 'webOnly'> = {}
) => {
  if (options.webOnly) {
    Webpack.printConnectionInstructions(projectRoot);
    return;
  }
  Log.newLine();
  const url = await UrlUtils.constructDeepLinkAsync(projectRoot);
  urlOpts.printQRCode(url);
  const wrapLength = process.stdout.columns || 80;
  const item = (text: string): string => ` ${BLT} ` + wrapAnsi(text, wrapLength).trimStart();
  Log.nested(item(`Waiting on ${u(url)}`));
  // Log.newLine();
  // TODO: if dev client, change this message!
  Log.nested(item(`Scan the QR code above with Expo Go (Android) or the Camera app (iOS)`));

  await printBasicUsageAsync(options);
  Webpack.printConnectionInstructions(projectRoot);
  printHelp();
  Log.newLine();
};

export function openDeveloperTools(url: string) {
  Log.log(`Opening developer tools in the browser...`);
  if (!openBrowser(url)) {
    Log.warn(`Unable to open developer tools in the browser`);
  }
}

export const startAsync = async (projectRoot: string, options: StartOptions) => {
  const { stdin } = process;
  const startWaitingForCommand = () => {
    if (!stdin.setRawMode) {
      Log.warn(
        'Non-interactive terminal, keyboard commands are disabled. Please upgrade to Node 12+'
      );
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', handleKeypress);
  };

  const stopWaitingForCommand = () => {
    stdin.removeListener('data', handleKeypress);
    if (!stdin.setRawMode) {
      Log.warn(
        'Non-interactive terminal, keyboard commands are disabled. Please upgrade to Node 12+'
      );
      return;
    }
    stdin.setRawMode(false);
    stdin.resume();
  };

  startWaitingForCommand();

  Prompts.addInteractionListener(({ pause }) => {
    if (pause) {
      stopWaitingForCommand();
    } else {
      startWaitingForCommand();
    }
  });

  UserManager.setInteractiveAuthenticationCallback(async () => {
    stopWaitingForCommand();
    try {
      return await loginOrRegisterIfLoggedOutAsync();
    } finally {
      startWaitingForCommand();
    }
  });

  await printServerInfo(projectRoot, options);

  async function handleKeypress(key: string) {
    if (options.webOnly) {
      switch (key) {
        case 'A':
        case 'a':
          Log.clear();
          Log.log('Opening the web project in Chrome on Android...');
          await Android.openWebProjectAsync({
            projectRoot,
            shouldPrompt: !options.nonInteractive && key === 'A',
          });
          printHelp();
          break;
        case 'i':
        case 'I':
          Log.clear();
          Log.log('Opening the web project in Safari on iOS...');
          await Simulator.openWebProjectAsync({
            projectRoot,
            shouldPrompt: !options.nonInteractive && key === 'I',
            // note(brentvatne): temporarily remove logic for picking the
            // simulator until we have parity for Android. this also ensures that we
            // don't interfere with the default user flow until more users have tested
            // this out.
            //
            // If no simulator is booted, then prompt which simulator to use.
            // (key === 'I' || !(await Simulator.isSimulatorBootedAsync())),
          });
          printHelp();
          break;
        case 'e':
          Log.log(chalk.red` ${BLT} Sending a URL is not supported in web-only mode`);
          break;
      }
    } else {
      switch (key) {
        case 'A':
          Log.clear();
          await Android.openProjectAsync({ projectRoot, shouldPrompt: true });
          printHelp();
          break;
        case 'a': {
          Log.clear();
          Log.log('Opening on Android...');
          await Android.openProjectAsync({ projectRoot });
          printHelp();
          break;
        }
        case 'I':
          Log.clear();
          await Simulator.openProjectAsync({
            projectRoot,
            shouldPrompt: true,
            devClient: options.devClient ?? false,
          });
          printHelp();
          break;
        case 'i': {
          Log.clear();

          // note(brentvatne): temporarily remove logic for picking the
          // simulator until we have parity for Android. this also ensures that we
          // don't interfere with the default user flow until more users have tested
          // this out.
          //
          // If no simulator is booted, then prompt for which simulator to use.
          // const shouldPrompt =
          //   !options.nonInteractive && (key === 'I' || !(await Simulator.isSimulatorBootedAsync()));

          Log.log('Opening on iOS...');
          await Simulator.openProjectAsync({
            projectRoot,
            shouldPrompt: false,
            devClient: options.devClient ?? false,
          });
          printHelp();
          break;
        }
        case 'e':
          await sendEmailAsync(projectRoot);
          break;
      }
    }

    switch (key) {
      case CTRL_C:
      case CTRL_D: {
        // @ts-ignore: Argument of type '"SIGINT"' is not assignable to parameter of type '"disconnect"'.
        process.emit('SIGINT');
        break;
      }
      case CTRL_L: {
        Log.clear();
        break;
      }
      case '?': {
        await printUsageAsync(projectRoot, options);
        break;
      }
      case 'w': {
        Log.log('Attempting to open the project in a web browser...');
        await Webpack.openAsync(projectRoot);
        await printServerInfo(projectRoot, options);
        break;
      }
      case 'c': {
        Log.clear();
        await printServerInfo(projectRoot, options);
        break;
      }
      case 'd': {
        const { devToolsPort } = await ProjectSettings.readPackagerInfoAsync(projectRoot);
        openDeveloperTools(`http://localhost:${devToolsPort}`);
        printHelp();
        break;
      }
      case 'D': {
        const enabled = !(await UserSettings.getAsync('openDevToolsAtStartup', true));
        await UserSettings.setAsync('openDevToolsAtStartup', enabled);
        const currentToggle = enabled ? 'enabled' : 'disabled';
        Log.log(`Auto opening developer tools on startup: ${chalk.bold(currentToggle)}`);
        logCommandsTable([['d', `open developer tools now`]]);
        break;
      }
      case 'p': {
        Log.clear();
        const projectSettings = await ProjectSettings.readAsync(projectRoot);
        const dev = !projectSettings.dev;
        await ProjectSettings.setAsync(projectRoot, { dev, minify: !dev });
        Log.log(
          `Metro bundler is now running in ${chalk.bold(
            dev ? 'development' : 'production'
          )}${chalk.reset(` mode.`)}
Please reload the project in Expo Go for the change to take effect.`
        );
        printHelp();
        break;
      }
      case 'r':
      case 'R': {
        Log.clear();
        const reset = key === 'R';
        if (reset) {
          Log.log('Restarting Metro bundler and clearing cache...');
        } else {
          Log.log('Restarting Metro bundler...');
        }
        Project.startAsync(projectRoot, { ...options, reset });
        break;
      }
      case 'o':
        Log.log('Trying to open the project in your editor...');
        await openInEditorAsync(projectRoot);
    }
  }
};

async function sendEmailAsync(projectRoot: string): Promise<void> {
  const lanAddress = await UrlUtils.constructDeepLinkAsync(projectRoot, {
    hostType: 'lan',
  });
  const defaultRecipient = await UserSettings.getAsync('sendTo', null);

  Log.addNewLineIfNone();

  Prompts.pauseInteractions();

  let recipient: string;
  try {
    recipient = await promptEmailAsync({
      message: `Email address ${chalk.dim(`(ESC to cancel)`)}`,
      initial: defaultRecipient ?? undefined,
    });
  } catch {
    Prompts.resumeInteractions();
    printHelp();
    return;
  }

  Prompts.resumeInteractions();

  Log.log(`Sending ${lanAddress} to ${recipient}...`);

  let sent = false;
  try {
    await Exp.sendAsync(recipient, lanAddress);
    sent = true;
    Log.log(`Sent link successfully.`);
  } catch (err) {
    Log.log(`Could not send link. ${err}`);
  }
  printHelp();
  if (sent) {
    await UserSettings.setAsync('sendTo', recipient);
  }
}
