import indentString from 'indent-string';
import _ from 'lodash-node';
import qrcodeTerminal from 'qrcode-terminal';

import {
  Android,
  ProjectSettings,
  Simulator,
} from 'xdl';

import CommandError from './CommandError';

function addOptions(program) {
  program
    .option('-a, --android', 'Opens your app in Exponent on a connected Android device')
    .option('-i, --ios', 'Opens your app in Exponent in a currently running iOS simulator on your computer')
    .option('-m, --host [mode]', 'tunnel (default), lan, localhost. Type of host to use. "tunnel" allows you to view your link on other networks')
    .option('-p, --protocol [mode]', 'exp (default), http, redirect. Type of protocol. "exp" is recommended right now')
    .option('--tunnel', 'Same as --host tunnel')
    .option('--lan', 'Same as --host lan')
    .option('--localhost', 'Same as --host localhost')
    .option('--dev', 'Turns dev flag on')
    .option('--no-dev', 'Turns dev flag off')
    .option('--strict', 'Turns strict flag on')
    .option('--no-strict', 'Turns strict flag off')
    .option('--minify', 'Turns minify flag on')
    .option('--no-minify', 'Turns minify flag off')
    .option('--exp', 'Same as --protocol exp')
    .option('--http', 'Same as --protocol http')
    .option('--redirect', 'Same as --protocol redirect')
    ;
}

function hasBooleanArg(rawArgs, argName) {
  return _.includes(rawArgs, '--' + argName) || _.includes(rawArgs, '--no-' + argName);
}

function getBooleanArg(rawArgs, argName) {
  if (_.includes(rawArgs, '--' + argName)) {
    return true;
  } else {
    return false;
  }
}

async function optsAsync(projectDir, options) {
  var opts = await ProjectSettings.readAsync(projectDir);

  if ((!!options.host + !!options.lan + !!options.localhost + !!options.tunnel) > 1) {
    throw CommandError('BAD_ARGS', "Specify at most one of --host, --tunnel, --lan, and --localhost");
  }

  if ((!!options.protocol + !!options.exp + !!options.http + !!options.redirect) > 1) {
    throw CommandError('BAD_ARGS', "Specify at most one of --protocol, --exp, --http, and --redirect");
  }

  if (options.host) { opts.hostType = options.host; }
  if (options.tunnel) { opts.hostType = 'tunnel'; }
  if (options.lan) { opts.hostType = 'lan'; }
  if (options.localhost) { opts.hostType = 'localhost'; }

  let rawArgs = options.parent.rawArgs;
  if (hasBooleanArg(rawArgs, 'dev')) { opts.dev = getBooleanArg(rawArgs, 'dev'); }
  if (hasBooleanArg(rawArgs, 'strict')) { opts.strict = getBooleanArg(rawArgs, 'strict'); }
  if (hasBooleanArg(rawArgs, 'minify')) { opts.minify = getBooleanArg(rawArgs, 'minify'); }

  if (options.protocol) { opts.urlType = options.protocol; }
  if (options.exp) { opts.urlType = 'exp'; }
  if (options.http) { opts.urlType = 'http'; }
  if (options.redirect) { opts.urlType = 'redirect'; }

  await ProjectSettings.setAsync(projectDir, opts);

  return opts;
}

function printQRCode(url) {
  qrcodeTerminal.generate(url, (code) => console.log(`${indentString(code, 2)}\n`));
}

async function handleMobileOptsAsync(projectDir, options) {
  if (options.android) {
    await Android.openProjectAsync(projectDir);
  }

  if (options.ios) {
    await Simulator.openProjectAsync(projectDir);
  }

  return !!options.android || !!options.ios;
}

export default {
  addOptions,
  handleMobileOptsAsync,
  printQRCode,
  optsAsync,
};
