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
import readline from 'readline';
import wrapAnsi from 'wrap-ansi';

import { loginOrRegisterIfLoggedOutAsync } from '../../accounts';
import Log from '../../log';
import urlOpts from '../../urlOpts';
import { openInEditorAsync } from '../utils/openInEditorAsync';

const CTRL_C = '\u0003';
const CTRL_D = '\u0004';
const CTRL_L = '\u000C';

const BLT = `\u203A`;
const { bold: b, italic: i, underline: u } = chalk;

type StartOptions = {
  reset?: boolean;
  nonInteractive?: boolean;
  nonPersistent?: boolean;
  maxWorkers?: number;
  webOnly?: boolean;
};

const printHelp = (): void => {
  Log.newLine();
  Log.nested(`Press ${b('?')} to show a list of all available commands.`);
};

const div = chalk.dim(`│`);

const printUsage = async (projectDir: string, options: Pick<StartOptions, 'webOnly'> = {}) => {
  const { dev } = await ProjectSettings.readAsync(projectDir);
  const openDevToolsAtStartup = await UserSettings.getAsync('openDevToolsAtStartup', true);
  const devMode = dev ? 'development' : 'production';
  const currentToggle = openDevToolsAtStartup ? 'enabled' : 'disabled';

  const isMac = process.platform === 'darwin';

  const ui = [
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
    ['d', `open Expo DevTools`],
    ['shift+d', `toggle auto opening DevTools on startup`, currentToggle],
    !options.webOnly && ['e', `share the app link by email`],
  ];

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
};

export const printServerInfo = async (
  projectDir: string,
  options: Pick<StartOptions, 'webOnly'> = {}
) => {
  if (options.webOnly) {
    Webpack.printConnectionInstructions(projectDir);
    return;
  }
  const url = await UrlUtils.constructDeepLinkAsync(projectDir);
  Log.newLine();
  Log.nested(` ${u(url)}`);
  Log.newLine();
  urlOpts.printQRCode(url);
  const wrapLength = process.stdout.columns || 80;
  const item = (text: string): string => ` ${BLT} ` + wrapAnsi(text, wrapLength).trimStart();
  const iosInfo = process.platform === 'darwin' ? `, or ${b('i')} for iOS simulator` : '';
  const webInfo = `${b`w`} to run on ${u`w`}eb`;
  Log.nested(wrapAnsi(u('To run the app, choose one of:'), wrapLength));

  // TODO: if dev client, chanege this message!
  Log.nested(item(`Scan the QR code above with the Expo app (Android) or the Camera app (iOS).`));

  // TODO: if no react-native-web in package.json then don't show web info
  Log.nested(item(`Press ${b`a`} for Android emulator${iosInfo}, or ${webInfo}.`));
  Log.nested(item(`Press ${b`e`} to send a link to your phone with email.`));

  Webpack.printConnectionInstructions(projectDir);
  printHelp();
};

export const startAsync = async (projectRoot: string, options: StartOptions) => {
  const { stdin } = process;
  const startWaitingForCommand = () => {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', handleKeypress);
  };

  const stopWaitingForCommand = () => {
    stdin.removeListener('data', handleKeypress);
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
          });
          printHelp();
          break;
        }
        case 'e': {
          stopWaitingForCommand();
          const lanAddress = await UrlUtils.constructDeepLinkAsync(projectRoot, {
            hostType: 'lan',
          });
          const defaultRecipient = await UserSettings.getAsync('sendTo', null);
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          const handleKeypress = (chr: string, key: { name: string }) => {
            if (key && key.name === 'escape') {
              cleanup();
              cancel();
            }
          };
          const cleanup = () => {
            rl.close();
            process.stdin.removeListener('keypress', handleKeypress);
            startWaitingForCommand();
          };
          const cancel = async () => {
            Log.clear();
            printHelp();
          };
          Log.clear();
          process.stdin.addListener('keypress', handleKeypress);
          Log.log('Please enter your email address (press ESC to cancel) ');
          rl.question(
            defaultRecipient ? `[default: ${defaultRecipient}]> ` : '> ',
            async sendTo => {
              cleanup();
              if (!sendTo && defaultRecipient) {
                sendTo = defaultRecipient;
              }
              sendTo = sendTo && sendTo.trim();
              if (!sendTo) {
                cancel();
                return;
              }
              Log.log(`Sending ${lanAddress} to ${sendTo}...`);

              let sent = false;
              try {
                await Exp.sendAsync(sendTo, lanAddress);
                sent = true;
                Log.log(`Sent link successfully.`);
              } catch (err) {
                Log.log(`Could not send link. ${err}`);
              }
              printHelp();
              if (sent) {
                await UserSettings.setAsync('sendTo', sendTo);
              }
            }
          );
          break;
        }
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
        await printUsage(projectRoot, options);
        break;
      }
      case 'w': {
        Log.clear();
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
        Log.log('Opening DevTools in the browser...');
        openBrowser(`http://localhost:${devToolsPort}`);
        printHelp();
        break;
      }
      case 'D': {
        Log.clear();
        const enabled = !(await UserSettings.getAsync('openDevToolsAtStartup', true));
        await UserSettings.setAsync('openDevToolsAtStartup', enabled);
        Log.log(
          `Automatically opening DevTools ${b(
            enabled ? 'enabled' : 'disabled'
          )}.\nPress ${b`d`} to open DevTools now.`
        );
        printHelp();
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
Please reload the project in the Expo app for the change to take effect.`
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
