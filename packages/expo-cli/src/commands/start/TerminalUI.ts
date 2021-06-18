import chalk from 'chalk';
import openBrowser from 'react-dev-utils/openBrowser';
import wrapAnsi from 'wrap-ansi';
import {
  Android,
  Project,
  ProjectSettings,
  Prompts,
  Simulator,
  UrlUtils,
  UserManager,
  UserSettings,
  Webpack,
} from 'xdl';

import { loginOrRegisterIfLoggedOutAsync } from '../../accounts';
import Log from '../../log';
import { selectAsync } from '../../prompts';
import urlOpts from '../../urlOpts';
import { openInEditorAsync } from '../utils/openInEditorAsync';
import { profileMethod } from '../utils/profileMethod';

const CTRL_C = '\u0003';
const CTRL_D = '\u0004';
const CTRL_L = '\u000C';

const BLT = `\u203A`;
const { bold: b, italic: i, underline: u } = chalk;

type StartOptions = {
  isWebSocketsEnabled?: boolean;
  isRemoteReloadingEnabled?: boolean;
  devClient?: boolean;
  reset?: boolean;
  nonInteractive?: boolean;
  nonPersistent?: boolean;
  maxWorkers?: number;
  webOnly?: boolean;
};

const printHelp = (): void => {
  logCommandsTable([['?', 'show all commands']]);
};

const div = chalk.dim(`│`);

export async function shouldOpenDevToolsOnStartupAsync() {
  return UserSettings.getAsync(
    'openDevToolsAtStartup',
    // Defaults to true for new users.
    // TODO: switch this to false.
    true
  );
}

const printUsageAsync = async (
  projectRoot: string,
  options: Pick<
    StartOptions,
    'webOnly' | 'devClient' | 'isWebSocketsEnabled' | 'isRemoteReloadingEnabled'
  > = {}
) => {
  const { dev } = await ProjectSettings.readAsync(projectRoot);
  const openDevToolsAtStartup = await shouldOpenDevToolsOnStartupAsync();
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
    !!options.isRemoteReloadingEnabled && ['r', `reload app`],
    !!options.isWebSocketsEnabled && ['m', `toggle menu`],
    !!options.isWebSocketsEnabled && ['shift+m', `more tools`],
    ['o', `open project code in your editor`],
    ['c', `show project QR`],
    ['p', `toggle build mode`, devMode],
    // TODO: Drop with SDK 40
    !options.isRemoteReloadingEnabled && ['r', `restart bundler`],
    !options.isRemoteReloadingEnabled && ['shift+r', `restart and clear cache`],
    [],
    ['d', `show developer tools`],
    ['shift+d', `toggle auto opening developer tools on startup`, currentToggle],
    [],
  ]);
};

const printBasicUsageAsync = async (
  options: Pick<StartOptions, 'webOnly' | 'isWebSocketsEnabled' | 'isRemoteReloadingEnabled'> = {}
) => {
  const isMac = process.platform === 'darwin';
  const openDevToolsAtStartup = await shouldOpenDevToolsOnStartupAsync();
  const currentToggle = openDevToolsAtStartup ? 'enabled' : 'disabled';

  logCommandsTable([
    [],
    ['a', `open Android`],
    isMac && ['i', `open iOS simulator`],
    ['w', `open web`],
    [],
    !!options.isRemoteReloadingEnabled && ['r', `reload app`],
    !!options.isWebSocketsEnabled && ['m', `toggle menu`],
    ['d', `show developer tools`],
    ['shift+d', `toggle auto opening developer tools on startup`, currentToggle],
    [],
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
  options: Pick<StartOptions, 'webOnly' | 'isWebSocketsEnabled' | 'isRemoteReloadingEnabled'> = {}
) => {
  if (options.webOnly) {
    Webpack.printConnectionInstructions(projectRoot);
    printHelp();
    return;
  }
  Log.newLine();
  const wrapLength = process.stdout.columns || 80;
  const item = (text: string): string => ` ${BLT} ` + wrapAnsi(text, wrapLength).trimStart();
  const url = await UrlUtils.constructDeepLinkAsync(projectRoot);

  urlOpts.printQRCode(url);
  Log.nested(item(`Waiting on ${u(url)}`));
  // Log.newLine();
  // TODO: if dev client, change this message!
  Log.nested(item(`Scan the QR code above with Expo Go (Android) or the Camera app (iOS)`));

  await printBasicUsageAsync(options);
  Webpack.printConnectionInstructions(projectRoot);
  printHelp();
  Log.addNewLineIfNone();
};

export function openDeveloperTools(url: string) {
  Log.log(`Opening developer tools in the browser...`);
  if (!openBrowser(url)) {
    Log.warn(`Unable to open developer tools in the browser`);
  }
}

export async function startAsync(projectRoot: string, options: StartOptions) {
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
          if (key === 'A') {
            Log.clear();
          }
          Log.log(`${BLT} Opening the web project in Chrome on Android...`);
          await Android.openWebProjectAsync({
            projectRoot,
            shouldPrompt: !options.nonInteractive && key === 'A',
          });
          printHelp();
          break;
        case 'i':
        case 'I':
          if (key === 'I') {
            Log.clear();
          }
          Log.log(`${BLT} Opening the web project in Safari on iOS...`);
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
      }
    } else {
      switch (key) {
        case 'A':
          Log.clear();
          await Android.openProjectAsync({
            projectRoot,
            shouldPrompt: true,
            devClient: options.devClient ?? false,
          });
          printHelp();
          break;
        case 'a': {
          Log.log(`${BLT} Opening on Android...`);
          await Android.openProjectAsync({ projectRoot, devClient: options.devClient ?? false });
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
          // note(brentvatne): temporarily remove logic for picking the
          // simulator until we have parity for Android. this also ensures that we
          // don't interfere with the default user flow until more users have tested
          // this out.
          //
          // If no simulator is booted, then prompt for which simulator to use.
          // const shouldPrompt =
          //   !options.nonInteractive && (key === 'I' || !(await Simulator.isSimulatorBootedAsync()));

          Log.log(`${BLT} Opening on iOS...`);
          await profileMethod(
            Simulator.openProjectAsync,
            'Simulator.openProjectAsync'
          )({
            projectRoot,
            shouldPrompt: false,
            devClient: options.devClient ?? false,
          });
          printHelp();
          break;
        }
      }
    }

    switch (key) {
      case CTRL_C:
      case CTRL_D: {
        // @ts-ignore: Argument of type '"SIGINT"' is not assignable to parameter of type '"disconnect"'.
        process.emit('SIGINT');
        // Prevent terminal UI from accepting commands while the process is closing.
        // Without this, fast typers will close the server then start typing their
        // next command and have a bunch of unrelated things pop up.
        Prompts.pauseInteractions();
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
        Log.log(`${BLT} Open in the web browser...`);
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
        const enabled = !(await shouldOpenDevToolsOnStartupAsync());
        await UserSettings.setAsync('openDevToolsAtStartup', enabled);
        const currentToggle = enabled ? 'enabled' : 'disabled';
        Log.log(`Auto opening developer tools on startup: ${chalk.bold(currentToggle)}`);
        logCommandsTable([['d', `show developer tools now`]]);
        break;
      }
      case 'm': {
        if (options.isWebSocketsEnabled) {
          Log.log(`${BLT} Toggling dev menu`);
          Project.broadcastMessage('devMenu');
        }
        break;
      }
      case 'M': {
        if (options.isWebSocketsEnabled) {
          Prompts.pauseInteractions();
          try {
            const value = await selectAsync({
              // Options match: Chrome > View > Developer
              message: `Dev tools ${chalk.dim`(native only)`}`,
              choices: [
                { title: 'Inspect elements', value: 'toggleElementInspector' },
                { title: 'Toggle performance monitor', value: 'togglePerformanceMonitor' },
                { title: 'Toggle developer menu', value: 'toggleDevMenu' },
                { title: 'Reload app', value: 'reload' },
                // TODO: Maybe a "View Source" option to open code.
                // Toggling Remote JS Debugging is pretty rough, so leaving it disabled.
                // { title: 'Toggle Remote Debugging', value: 'toggleRemoteDebugging' },
              ],
            });
            Project.broadcastMessage('sendDevCommand', { name: value });
          } catch {
            // do nothing
          } finally {
            Prompts.resumeInteractions();
            printHelp();
          }
        }
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
        if (options.isRemoteReloadingEnabled) {
          Log.log(`${BLT} Reloading apps`);
          // Send reload requests over the metro dev server
          Project.broadcastMessage('reload');
          // Send reload requests over the webpack dev server
          Webpack.broadcastMessage('content-changed');
        } else if (!options.webOnly) {
          // [SDK 40]: Restart bundler
          Log.clear();
          Project.startAsync(projectRoot, { ...options, reset: false });
          Log.log('Restarting Metro bundler...');
        }
        break;
      case 'R':
        if (!options.isRemoteReloadingEnabled) {
          // [SDK 40]: Restart bundler with cache
          Log.clear();
          Project.startAsync(projectRoot, { ...options, reset: true });
          Log.log('Restarting Metro bundler and clearing cache...');
        }
        break;
      case 'o':
        Log.log(`${BLT} Opening the editor...`);
        await openInEditorAsync(projectRoot);
    }
  }
}
