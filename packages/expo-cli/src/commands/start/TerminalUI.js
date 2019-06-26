// @flow

import {
  Android,
  Exp,
  Project,
  ProjectSettings,
  ProjectUtils,
  Simulator,
  UrlUtils,
  User,
  UserSettings,
  Webpack,
} from '@expo/xdl';

import chalk from 'chalk';
import openBrowser from 'react-dev-utils/openBrowser';
import readline from 'readline';
import trimStart from 'lodash/trimStart';
import wordwrap from 'wordwrap';

import { loginOrRegisterIfLoggedOut } from '../../accounts';
import urlOpts from '../../urlOpts';
import log from '../../log';

const CTRL_C = '\u0003';
const CTRL_D = '\u0004';
const CTRL_L = '\u000C';

const { bold: b, italic: i, underline: u } = chalk;

const clearConsole = () => {
  process.stdout.write(process.platform === 'win32' ? '\x1Bc' : '\x1B[2J\x1B[3J\x1B[H');
};

const printHelp = () => {
  log.newLine();
  log.nested(`Press ${b('?')} to show a list of all available commands.`);
};

const printUsage = async projectDir => {
  const { dev } = await ProjectSettings.readAsync(projectDir);
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  const openDevToolsAtStartup = await UserSettings.getAsync('openDevToolsAtStartup', true);
  const username = await User.getCurrentUsernameAsync();
  const devMode = dev ? 'development' : 'production';
  const iosInfo = process.platform === 'darwin' ? `, or ${b`i`} to run on ${u`i`}OS simulator` : '';
  const webInfo = exp.platforms.includes('web') ? `, ${b`w`} to run on ${u`w`}eb` : '';
  log.nested(`
 \u203A Press ${b`a`} to run on ${u`A`}ndroid device/emulator${iosInfo}${webInfo}.
 \u203A Press ${b`c`} to show info on ${u`c`}onnecting new devices.
 \u203A Press ${b`d`} to open DevTools in the default web browser.
 \u203A Press ${b`shift-d`} to ${
    openDevToolsAtStartup ? 'disable' : 'enable'
  } automatically opening ${u`D`}evTools at startup.
 \u203A Press ${b`e`} to send an app link with ${u`e`}mail.
 \u203A Press ${b`p`} to toggle ${u`p`}roduction mode. (current mode: ${i(devMode)})
 \u203A Press ${b`r`} to ${u`r`}estart bundler, or ${b`shift-r`} to restart and clear cache.
 \u203A Press ${b`s`} to ${u`s`}ign ${
    username ? `out. (Signed in as ${i('@' + username)}.)` : 'in.'
  }
`);
};

export const printServerInfo = async projectDir => {
  const url = await UrlUtils.constructManifestUrlAsync(projectDir);
  const username = await User.getCurrentUsernameAsync();
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

  await printServerInfo(projectDir);

  async function handleKeypress(key) {
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
        await printUsage(projectDir);
        break;
      }
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
      case 'w': {
        clearConsole();
        log('Trying to open the project in a web browser...');
        await Webpack.openAsync(projectDir);
        printHelp();
        break;
      }
      case 'c': {
        clearConsole();
        await printServerInfo(projectDir);
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
        const enabled = !(await UserSettings.getAsync('openDevToolsAtStartup', true));
        await UserSettings.setAsync('openDevToolsAtStartup', enabled);
        log(
          `Automatically opening DevTools ${b(
            enabled ? 'enabled' : 'disabled'
          )}.\nPress ${b`d`} to open DevTools now.`
        );
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
        rl.question(defaultRecipient ? `[default: ${defaultRecipient}]> ` : '> ', async sendTo => {
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
        });
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
        Project.startAsync(projectDir, { reset });
        break;
      }
      case 's': {
        const authSession = await User.getSessionAsync();
        if (authSession) {
          await User.logoutAsync();
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
