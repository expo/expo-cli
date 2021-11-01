import { ExpoConfig } from '@expo/config-types';
import { openJsInspector, queryAllInspectorAppsAsync } from '@expo/dev-server';
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
import { learnMore } from '../utils/TerminalLink';
import { openInEditorAsync } from '../utils/openInEditorAsync';

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
  platforms?: ExpoConfig['platforms'];
};

const printHelp = (): void => {
  logCommandsTable([{ key: '?', msg: 'show all commands' }]);
};

const div = chalk.dim(`│`);

export async function shouldOpenDevToolsOnStartupAsync() {
  return UserSettings.getAsync(
    'openDevToolsAtStartup',
    // Defaults to false for new users.
    // We can swap this back to true when dev tools UI has a code owner again.
    false
  );
}

const printUsageAsync = async (
  projectRoot: string,
  options: Pick<
    StartOptions,
    'webOnly' | 'devClient' | 'isWebSocketsEnabled' | 'isRemoteReloadingEnabled' | 'platforms'
  >
) => {
  const { dev } = await ProjectSettings.readAsync(projectRoot);
  const openDevToolsAtStartup = await shouldOpenDevToolsOnStartupAsync();
  const devMode = dev ? 'development' : 'production';
  const currentToggle = openDevToolsAtStartup ? 'enabled' : 'disabled';

  const isMac = process.platform === 'darwin';

  const { platforms = ['ios', 'android', 'web'] } = options;

  const isAndroidDisabled = !platforms.includes('android');
  const isIosDisabled = !platforms.includes('ios');
  const isWebDisable = !platforms.includes('web');

  logCommandsTable([
    {},
    { key: 'a', msg: `open Android`, disabled: isAndroidDisabled },
    { key: 'shift+a', msg: `select a device or emulator`, disabled: isAndroidDisabled },
    isMac && { key: 'i', msg: `open iOS simulator`, disabled: isIosDisabled },
    isMac && { key: 'shift+i', msg: `select a simulator`, disabled: isIosDisabled },
    { key: 'w', msg: `open web`, disabled: isWebDisable },
    {},
    !!options.isRemoteReloadingEnabled && { key: 'r', msg: `reload app` },
    !!options.isWebSocketsEnabled && { key: 'm', msg: `toggle menu` },
    !!options.isWebSocketsEnabled && { key: 'shift+m', msg: `more tools` },
    !!options.isWebSocketsEnabled && { key: 'j', msg: `open JavaScript inspector for Hermes` },
    { key: 'o', msg: `open project code in your editor` },
    { key: 'c', msg: `show project QR` },
    { key: 'p', msg: `toggle build mode`, status: devMode },
    // TODO: Drop with SDK 40
    !options.isRemoteReloadingEnabled && { key: 'r', msg: `restart bundler` },
    !options.isRemoteReloadingEnabled && { key: 'shift+r', msg: `restart and clear cache` },
    {},
    { key: 'd', msg: `show developer tools` },
    {
      key: 'shift+d',
      msg: `toggle auto opening developer tools on startup`,
      status: currentToggle,
    },
    {},
  ]);
};

const printBasicUsageAsync = async (
  options: Pick<
    StartOptions,
    'webOnly' | 'isWebSocketsEnabled' | 'isRemoteReloadingEnabled' | 'platforms'
  >
) => {
  const isMac = process.platform === 'darwin';
  const openDevToolsAtStartup = await shouldOpenDevToolsOnStartupAsync();
  const currentToggle = openDevToolsAtStartup ? 'enabled' : 'disabled';

  const { platforms = ['ios', 'android', 'web'] } = options;

  const isAndroidDisabled = !platforms.includes('android');
  const isIosDisabled = !platforms.includes('ios');
  const isWebDisable = !platforms.includes('web');

  logCommandsTable([
    {},
    { key: 'a', msg: `open Android`, disabled: isAndroidDisabled },
    isMac && { key: 'i', msg: `open iOS simulator`, disabled: isIosDisabled },
    { key: 'w', msg: `open web`, disabled: isWebDisable },
    {},
    !!options.isRemoteReloadingEnabled && { key: 'r', msg: `reload app` },
    !!options.isWebSocketsEnabled && { key: 'm', msg: `toggle menu` },
    { key: 'd', msg: `show developer tools` },
    {
      key: 'shift+d',
      msg: `toggle auto opening developer tools on startup`,
      status: currentToggle,
    },
    {},
  ]);
};

function logCommandsTable(
  ui: (false | { key?: string; msg?: string; status?: string; disabled?: boolean })[]
) {
  Log.nested(
    ui
      .filter(Boolean)
      // @ts-ignore: filter doesn't work
      .map(({ key, msg, status, disabled }) => {
        if (!key) return '';
        let view = `${BLT} `;
        if (key.length === 1) view += 'Press ';
        view += `${b(key)} ${div} `;
        view += msg;
        if (status) {
          view += ` ${chalk.dim(`(${i(status)})`)}`;
        }
        if (disabled) {
          view = chalk.dim(view);
        }
        return view;
      })
      .join('\n')
  );
}

const printServerInfo = async (
  projectRoot: string,
  options: Pick<
    StartOptions,
    'webOnly' | 'isWebSocketsEnabled' | 'isRemoteReloadingEnabled' | 'platforms'
  >
) => {
  const wrapLength = process.stdout.columns || 80;
  const item = (text: string): string => `${BLT} ` + wrapAnsi(text, wrapLength).trimStart();

  if (!options.webOnly) {
    try {
      const url = await UrlUtils.constructDeepLinkAsync(projectRoot);

      urlOpts.printQRCode(url);
      Log.nested(item(`Metro waiting on ${u(url)}`));
      // Log.newLine();
      // TODO: if dev client, change this message!
      Log.nested(item(`Scan the QR code above with Expo Go (Android) or the Camera app (iOS)`));
    } catch (error) {
      // @ts-ignore: If there is no dev client scheme, then skip the QR code.
      if (error.code !== 'NO_DEV_CLIENT_SCHEME') {
        throw error;
      } else {
        const serverUrl = await UrlUtils.constructManifestUrlAsync(projectRoot, {
          urlType: 'http',
        });
        Log.nested(item(`Metro waiting on ${u(serverUrl)}`));
        Log.nested(item(`Linking is disabled because the client scheme cannot be resolved.`));
      }
    }
  }

  const webUrl = await Webpack.getUrlAsync(projectRoot);
  if (webUrl) {
    Log.addNewLineIfNone();
    Log.nested(item(`Webpack waiting on ${u(webUrl)}`));
    Log.nested(chalk.gray(item(`Expo Webpack (web) is in beta, and subject to breaking changes!`)));
  }

  await printBasicUsageAsync(options);
  printHelp();
  Log.addNewLineIfNone();
};

export function openDeveloperTools(url: string) {
  Log.log(`Opening developer tools in the browser...`);
  if (!openBrowser(url)) {
    Log.warn(`Unable to open developer tools in the browser`);
  }
}

async function openJsInsectorAsync(projectRoot: string) {
  const { packagerPort } = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  const metroServerOrigin = `http://localhost:${packagerPort}`;
  const apps = await queryAllInspectorAppsAsync(metroServerOrigin);
  if (apps.length === 0) {
    Log.warn(
      `No compatible apps connected. This feature is only available for apps using the Hermes runtime. ${learnMore(
        'https://docs.expo.dev/guides/using-hermes/'
      )}`
    );
    return;
  }
  for (const app of apps) {
    openJsInspector(app);
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
    const shouldPrompt = !options.nonInteractive && ['I', 'A'].includes(key);
    if (shouldPrompt) {
      Log.clear();
    }
    const { platforms = ['ios', 'android', 'web'] } = options;

    switch (key) {
      case 'A':
      case 'a':
        if (options.webOnly && !Webpack.isTargetingNative()) {
          Log.log(`${BLT} Opening the web project in Chrome on Android...`);
          const results = await Android.openWebProjectAsync({
            projectRoot,
            shouldPrompt,
          });
          if (!results.success) {
            Log.nestedError(results.error);
          }
        } else {
          const isDisabled = !platforms.includes('android');
          if (isDisabled) {
            Log.nestedWarn(
              `Android is disabled, enable it by adding ${chalk.bold`android`} to the platforms array in your app.json or app.config.js`
            );
            break;
          }

          Log.log(`${BLT} Opening on Android...`);
          const results = await Android.openProjectAsync({
            projectRoot,
            shouldPrompt,
            devClient: options.devClient ?? false,
          });
          if (!results.success && results.error !== 'escaped') {
            Log.nestedError(
              typeof results.error === 'string' ? results.error : results.error.message
            );
          }
        }
        printHelp();
        break;
      case 'I':
      case 'i':
        if (options.webOnly && !Webpack.isTargetingNative()) {
          Log.log(`${BLT} Opening the web project in Safari on iOS...`);
          const results = await Simulator.openWebProjectAsync({
            projectRoot,
            shouldPrompt,
          });
          if (!results.success) {
            Log.nestedError(results.error);
          }
        } else {
          const isDisabled = !platforms.includes('ios');
          if (isDisabled) {
            Log.nestedWarn(
              `iOS is disabled, enable it by adding ${chalk.bold`ios`} to the platforms array in your app.json or app.config.js`
            );
            break;
          }
          Log.log(`${BLT} Opening on iOS...`);
          const results = await Simulator.openProjectAsync({
            projectRoot,
            shouldPrompt,
            devClient: options.devClient ?? false,
          });
          if (!results.success && results.error !== 'escaped') {
            Log.nestedError(results.error);
          }
        }
        printHelp();
        break;
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
        const isDisabled = !platforms.includes('web');
        if (isDisabled) {
          Log.nestedWarn(
            `Web is disabled, enable it by installing ${chalk.bold`react-native-web`} and adding ${chalk.bold`web`} to the platforms array in your app.json or app.config.js`
          );
          break;
        }

        // Ensure the Webpack dev server is running first
        const isStarted = await Webpack.getUrlAsync(projectRoot);

        if (!isStarted) {
          await Project.startAsync(projectRoot, { webOnly: true });
          // When this is the first time webpack is started, reprint the connection info.
          await printServerInfo(projectRoot, options);
        }

        Log.log(`${BLT} Open in the web browser...`);
        await Webpack.openAsync(projectRoot);
        printHelp();
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
        logCommandsTable([{ key: 'd', msg: `show developer tools now` }]);
        break;
      }
      case 'j': {
        await openJsInsectorAsync(projectRoot);
        break;
      }
      case 'm': {
        if (options.isWebSocketsEnabled) {
          Log.log(`${BLT} Toggling dev menu`);
          Project.broadcastMessage('devMenu');
          Webpack.broadcastMessage('devMenu');
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
            Webpack.broadcastMessage('sendDevCommand', { name: value });
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
          // Send reload requests over the dev servers
          Project.broadcastMessage('reload');

          Webpack.broadcastMessage('reload');
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
        await openInEditorAsync(projectRoot, { editor: process.env.EXPO_EDITOR });
    }
  }
}
