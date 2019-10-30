import indentString from 'indent-string';
import qrcodeTerminal from 'qrcode-terminal';

import { Android, ProjectSettings, Simulator, Webpack } from '@expo/xdl';
import { Command } from 'commander';

import CommandError from './CommandError';

function addOptions(program: Command) {
  program
    .option('-a, --android', 'Opens your app in Expo on a connected Android device')
    .option(
      '-i, --ios',
      'Opens your app in Expo in a currently running iOS simulator on your computer'
    )
    .option('-w, --web', 'Opens your app in a web browser')
    .option(
      '-m, --host [mode]',
      'lan (default), tunnel, localhost. Type of host to use. "tunnel" allows you to view your link on other networks'
    )
    .option('--tunnel', 'Same as --host tunnel')
    .option('--lan', 'Same as --host lan')
    .option('--localhost', 'Same as --host localhost')
    .option('--dev', 'Turns dev flag on')
    .option('--no-dev', 'Turns dev flag off')
    .option('--minify', 'Turns minify flag on')
    .option('--no-minify', 'Turns minify flag off')
    .option('--https', 'To start webpack with https protocol')
    .option('--no-https', 'To start webpack with http protocol');
}

function hasBooleanArg(rawArgs: string[], argName: string) {
  return rawArgs.includes('--' + argName) || rawArgs.includes('--no-' + argName);
}

function getBooleanArg(rawArgs: string[], argName: string) {
  if (rawArgs.includes('--' + argName)) {
    return true;
  } else {
    return false;
  }
}

async function optsAsync(projectDir: string, options: any) {
  var opts = await ProjectSettings.readAsync(projectDir);

  if ([options.host, options.lan, options.localhost, options.tunnel].filter(i => i).length > 1) {
    throw new CommandError(
      'BAD_ARGS',
      'Specify at most one of --host, --tunnel, --lan, and --localhost'
    );
  }

  if (options.host) {
    opts.hostType = options.host;
  } else if (options.tunnel) {
    opts.hostType = 'tunnel';
  } else if (options.lan) {
    opts.hostType = 'lan';
  } else if (options.localhost) {
    opts.hostType = 'localhost';
  } else {
    opts.hostType = 'lan';
  }

  let rawArgs = options.parent.rawArgs;

  if (hasBooleanArg(rawArgs, 'dev')) {
    opts.dev = getBooleanArg(rawArgs, 'dev');
  } else {
    if (rawArgs.includes('start') || rawArgs.includes('r')) {
      opts.dev = true;
      opts.minify = false;
    }
  }
  if (hasBooleanArg(rawArgs, 'minify')) {
    opts.minify = getBooleanArg(rawArgs, 'minify');
  }
  if (hasBooleanArg(rawArgs, 'https')) {
    opts.https = getBooleanArg(rawArgs, 'https');
  }

  await ProjectSettings.setAsync(projectDir, opts);

  return opts;
}

function printQRCode(url: string) {
  qrcodeTerminal.generate(url, code => console.log(`${indentString(code, 2)}\n`));
}

async function handleMobileOptsAsync(projectDir: string, options: any) {
  if (options.android) {
    if (options.webOnly) {
      await Android.openWebProjectAsync(projectDir);
    } else {
      await Android.openProjectAsync(projectDir);
    }
  }

  if (options.ios) {
    if (options.webOnly) {
      await Simulator.openWebProjectAsync(projectDir);
    } else {
      await Simulator.openProjectAsync(projectDir);
    }
  }

  if (options.web) {
    await Webpack.openAsync(projectDir);
  }

  return !!options.android || !!options.ios;
}

export default {
  addOptions,
  handleMobileOptsAsync,
  printQRCode,
  optsAsync,
};
