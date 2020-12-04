import { getDefaultTarget } from '@expo/config';
import { Android, ConnectionStatus, ProjectSettings, Simulator, Webpack } from '@expo/xdl';
import { Command } from 'commander';
import indentString from 'indent-string';
import qrcodeTerminal from 'qrcode-terminal';

import CommandError, { AbortCommandError } from './CommandError';
import log from './log';
import { getDevClientSchemeAsync } from './schemes';

export type URLOptions = {
  devClient?: boolean;
  android?: boolean;
  ios?: boolean;
  web?: boolean;
  scheme?: string;
  host?: 'lan' | 'tunnel' | 'localhost';
  tunnel?: boolean;
  lan?: boolean;
  localhost?: boolean;
};

function addOptions(program: Command) {
  program
    .option(
      '--dev-client',
      'Experimental: Starts the bundler for use with the expo-development-client'
    )
    .option('--scheme <scheme>', 'Custom URI protocol to use with a dev client')
    .option('-a, --android', 'Opens your app in Expo client on a connected Android device')
    .option(
      '-i, --ios',
      'Opens your app in Expo client in a currently running iOS simulator on your computer'
    )
    .option('-w, --web', 'Opens your app in a web browser')
    .option(
      '-m, --host [mode]',
      'lan (default), tunnel, localhost. Type of host to use. "tunnel" allows you to view your link on other networks'
    )
    .option('--tunnel', 'Same as --host tunnel')
    .option('--lan', 'Same as --host lan')
    .option('--localhost', 'Same as --host localhost');
}

async function optsAsync(projectDir: string, options: any) {
  var opts = await ProjectSettings.readAsync(projectDir);

  if ([options.host, options.lan, options.localhost, options.tunnel].filter(i => i).length > 1) {
    throw new CommandError(
      'BAD_ARGS',
      'Specify at most one of --host, --tunnel, --lan, and --localhost'
    );
  }

  opts.hostType = 'lan';

  if (options.offline) {
    // TODO: maybe let people know that we will force localhost with offline?
    ConnectionStatus.setIsOffline(true);
    opts.hostType = 'localhost';
  }

  if (options.host) {
    opts.hostType = options.host;
  } else if (options.tunnel) {
    opts.hostType = 'tunnel';
  } else if (options.lan) {
    opts.hostType = 'lan';
  } else if (options.localhost) {
    opts.hostType = 'localhost';
  }

  // Prevent using --dev-client in a managed app.
  if (options.devClient) {
    const defaultTarget = getDefaultTarget(projectDir);
    if (defaultTarget !== 'bare') {
      log.warn(
        `\nOption ${log.chalk.cyan(
          '--dev-client'
        )} can only be used in bare workflow apps. Run ${log.chalk.cyan(
          'expo eject'
        )} and try again\n`
      );
      throw new AbortCommandError();
    }
  }

  if (typeof options.scheme === 'string') {
    // Use the custom scheme
    opts.scheme = options.scheme ?? null;
  } else if (options.devClient) {
    // Attempt to find the scheme or warn the user how to setup a custom scheme
    opts.scheme = await getDevClientSchemeAsync(projectDir);
  } else {
    // Ensure this is reset when users don't use `--scheme` or `--dev-client`
    opts.scheme = null;
  }

  await ProjectSettings.setAsync(projectDir, opts);

  return opts;
}

function printQRCode(url: string) {
  qrcodeTerminal.generate(url, code => log(`${indentString(code, 1)}\n`));
}

async function handleMobileOptsAsync(
  projectRoot: string,
  options: Pick<URLOptions, 'ios' | 'android' | 'web'> & { webOnly?: boolean }
) {
  await Promise.all([
    (async () => {
      if (options.android) {
        if (options.webOnly) {
          await Android.openWebProjectAsync({ projectRoot });
        } else {
          await Android.openProjectAsync({ projectRoot });
        }
      }
    })(),
    (async () => {
      if (options.ios) {
        if (options.webOnly) {
          await Simulator.openWebProjectAsync({ projectRoot, shouldPrompt: false });
        } else {
          await Simulator.openProjectAsync({ projectRoot, shouldPrompt: false });
        }
      }
    })(),
    (async () => {
      if (options.web) {
        await Webpack.openAsync(projectRoot);
      }
    })(),
  ]);

  return !!options.android || !!options.ios;
}

export default {
  addOptions,
  handleMobileOptsAsync,
  printQRCode,
  optsAsync,
};
