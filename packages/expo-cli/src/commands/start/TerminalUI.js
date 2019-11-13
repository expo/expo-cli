// @flow

import { projectHasModule, readConfigJsonAsync } from '@expo/config';
import {
  Android,
  Exp,
  Project,
  ProjectSettings,
  ProjectUtils,
  Simulator,
  UrlUtils,
  UserManager,
  UserSettings,
  Webpack,
} from '@expo/xdl';
import chalk from 'chalk';
import trimStart from 'lodash/trimStart';
import openBrowser from 'react-dev-utils/openBrowser';
import readline from 'readline';
import wordwrap from 'wordwrap';
import { loginOrRegisterIfLoggedOut } from '../../accounts';
import log from '../../log';
import urlOpts from '../../urlOpts';

const CTRL_C = '\u0003';
const CTRL_D = '\u0004';
const CTRL_L = '\u000C';

const { bold: b, italic: i, underline: u } = chalk;

const clearConsole = () => {
  process.stdout.write(process.platform === 'win32' ? '\x1Bc' : '\x1B[2J\x1B[3J\x1B[H');
};

const printHelp = () => {
  const PLATFORM_TAG = ProjectUtils.getPlatformTag('Expo');
  log.newLine();
  log.nested(`${PLATFORM_TAG} Press ${b('?')} to show a list of all available commands.`);
};

const printUsage = async (projectDir, options = {}) => {
  const { dev } = await ProjectSettings.readAsync(projectDir);
  const openDevToolsAtStartup = await UserSettings.getAsync('openDevToolsAtStartup', true);
  const username = await UserManager.getCurrentUsernameAsync();
  const devMode = dev ? 'development' : 'production';
  const androidInfo = `${b`a`} to run on ${u`A`}ndroid device/emulator`;
  const iosInfo = process.platform === 'darwin' ? `${b`i`} to run on ${u`i`}OS simulator` : '';
  const webInfo = projectHasModule('react-native-web') ? `${b`w`} to run on ${u`w`}eb` : '';
  const platformInfo = [androidInfo, iosInfo, webInfo].filter(Boolean).join(', or ');
  log.nested(`
 \u203A Press ${platformInfo}.
 \u203A Press ${b`c`} to show info on ${u`c`}onnecting new devices.
 \u203A Press ${b`d`} to open DevTools in the default web browser.
 \u203A Press ${b`shift-d`} to ${openDevToolsAtStartup
    ? 'disable'
    : 'enable'} automatically opening ${u`D`}evTools at startup.${options.webOnly
    ? ''
    : `\n \u203A Press ${b`e`} to send an app link with ${u`e`}mail.`}
 \u203A Press ${b`p`} to toggle ${u`p`}roduction mode. (current mode: ${i(devMode)})
 \u203A Press ${b`r`} to ${u`r`}estart bundler, or ${b`shift-r`} to restart and clear cache.
 \u203A Press ${b`s`} to ${u`s`}ign ${username
    ? `out. (Signed in as ${i('@' + username)}.)`
    : 'in.'}
`);
};

export const printServerInfo = async (projectDir, options = {}) => {
  if (options.webOnly) {
    Webpack.printConnectionInstructions(projectDir);
    printHelp();
    return;
  }
  const url = await UrlUtils.constructManifestUrlAsync(projectDir);
  const username = await UserManager.getCurrentUsernameAsync();
  log.newLine();
  log.nested(`  ${u(url)}`);
  log.newLine();
  urlOpts.printQRCode(url);
  const wrap = wordwrap(2, process.stdout.columns || 80);
  const wrapItem = wordwrap(4, process.stdout.columns || 80);
  const item = text => '  \u2022 ' + trimStart(wrapItem(text));
  const iosInfo = process.platform === 'darwin' ? `, or ${b('i')} for iOS simulator` : '';
  log.nested(wrap(u('To run the app with live reloading, choose one of:')));
  if (username) {
    log.nested(
      item(
        `Sign in as ${i(
          '@' + username
        )} in Expo Client on Android or iOS. Your projects will automatically appear in the "Projects" tab.`
      )
    );
  }
  log.nested(item(`Scan the QR code above with the Expo app (Android) or the Camera app (iOS).`));
  log.nested(item(`Press ${b`a`} for Android emulator${iosInfo}.`));
  log.nested(item(`Press ${b`e`} to send a link to your phone with email.`));
  if (!username) {
    log.nested(item(`Press ${b`s`} to sign in and enable more options.`));
  }

  Webpack.printConnectionInstructions(projectDir);
  printHelp();
};

export const startAsync = async (projectDir, options) => {
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

  await printServerInfo(projectDir, options);

  async function handleKeypress(key) {
    if (options.webOnly) {
      switch (key) {
        case 'a':
          clearConsole();
          log('Trying to open the web project in Chrome on Android...');
          await Android.openWebProjectAsync(projectDir);
          printHelp();
          break;
        case 'i':
          clearConsole();
          log('Trying to open the web project in Safari on the iOS simulator...');
          await Simulator.openWebProjectAsync(projectDir);
          printHelp();
          break;
        case 'e':
          log(chalk.red` \u203A Sending a URL is not supported in web-only mode`);
          break;
      }
    } else {
      switch (key) {
        case 'a': {
          clearConsole();
          log('Trying to open the project on Android...');
          await Android.openProjectAsync(projectDir);
          printHelp();
          break;
        }
        case 'i': {
          clearConsole();
          log('Trying to open the project in iOS simulator...');
          await Simulator.openProjectAsync(projectDir);
          printHelp();
          break;
        }
        case 'e': {
          stopWaitingForCommand();
          const lanAddress = await UrlUtils.constructManifestUrlAsync(projectDir, {
            hostType: 'lan',
          });
          const defaultRecipient = await UserSettings.getAsync('sendTo', null);
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          const handleKeypress = (chr, key) => {
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
            clearConsole();
            printHelp();
          };
          clearConsole();
          process.stdin.addListener('keypress', handleKeypress);
          log('Please enter your email address (press ESC to cancel) ');
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
              log(`Sending ${lanAddress} to ${sendTo}...`);

              let sent = false;
              try {
                await Exp.sendAsync(sendTo, lanAddress);
                log(`Sent link successfully.`);
                sent = true;
              } catch (err) {
                log(`Could not send link. ${err}`);
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
        process.emit('SIGINT');
        break;
      }
      case CTRL_L: {
        clearConsole();
        break;
      }
      case '?': {
        await printUsage(projectDir, options);
        break;
      }
      case 'w': {
        clearConsole();
        log('Attempting to open the project in a web browser...');
        await Webpack.openAsync(projectDir);
        await printServerInfo(projectDir, options);
        break;
      }
      case 'c': {
        clearConsole();
        await printServerInfo(projectDir, options);
        break;
      }
      case 'd': {
        const { devToolsPort } = await ProjectSettings.readPackagerInfoAsync(projectDir);
        log('Opening DevTools in the browser...');
        openBrowser(`http://localhost:${devToolsPort}`);
        printHelp();
        break;
      }
      case 'D': {
        clearConsole();
        const enabled = !await UserSettings.getAsync('openDevToolsAtStartup', true);
        await UserSettings.setAsync('openDevToolsAtStartup', enabled);
        log(
          `Automatically opening DevTools ${b(
            enabled ? 'enabled' : 'disabled'
          )}.\nPress ${b`d`} to open DevTools now.`
        );
        printHelp();
        break;
      }
      case 'p': {
        clearConsole();
        const projectSettings = await ProjectSettings.readAsync(projectDir);
        const dev = !projectSettings.dev;
        await ProjectSettings.setAsync(projectDir, { dev, minify: !dev });
        log(
          `Metro Bundler is now running in ${chalk.bold(
            dev ? 'development' : 'production'
          )}${chalk.reset(` mode.`)}
Please reload the project in the Expo app for the change to take effect.`
        );
        printHelp();
        break;
      }
      case 'r':
      case 'R': {
        clearConsole();
        const reset = key === 'R';
        if (reset) {
          log('Restarting Metro Bundler and clearing cache...');
        } else {
          log('Restarting Metro Bundler...');
        }
        Project.startAsync(projectDir, { ...options, reset });
        break;
      }
      case 's': {
        const authSession = await UserManager.getSessionAsync();
        if (authSession) {
          await UserManager.logoutAsync();
          log('Signed out.');
        } else {
          stopWaitingForCommand();
          try {
            await loginOrRegisterIfLoggedOut();
          } catch (e) {
            log.error(e);
          } finally {
            startWaitingForCommand();
          }
        }
        printHelp();
        break;
      }
    }
  }
};
