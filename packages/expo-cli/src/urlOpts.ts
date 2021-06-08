import { Command } from 'commander';
import indentString from 'indent-string';
import qrcodeTerminal from 'qrcode-terminal';
import { Android, ConnectionStatus, ProjectSettings, Simulator, Webpack } from 'xdl';

import CommandError from './CommandError';
import Log from './log';
import { getDevClientSchemeAsync } from './schemes';

// NOTE: if you update this, you should also update assertValidOptions in UrlUtils.ts
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
    .option('-a, --android', 'Opens your app in Expo Go on a connected Android device')
    .option(
      '-i, --ios',
      'Opens your app in Expo Go in a currently running iOS simulator on your computer'
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

async function optsAsync(projectRoot: string, options: any) {
  const opts = await ProjectSettings.readAsync(projectRoot);

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

  if (typeof options.scheme === 'string') {
    // Use the custom scheme
    opts.scheme = options.scheme ?? null;
  } else if (options.devClient) {
    // Attempt to find the scheme or warn the user how to setup a custom scheme
    opts.scheme = await getDevClientSchemeAsync(projectRoot);
  } else {
    // Ensure this is reset when users don't use `--scheme` or `--dev-client`
    opts.scheme = null;
  }

  await ProjectSettings.setAsync(projectRoot, opts);

  return opts;
}

function printQRCode(url: string) {
  qrcodeTerminal.generate(url, code => Log.log(`${indentString(code, 1)}\n`));
}

async function handleMobileOptsAsync(
  projectRoot: string,
  options: Pick<URLOptions, 'devClient' | 'ios' | 'android' | 'web'> & { webOnly?: boolean }
) {
  await Promise.all([
    (async () => {
      if (options.android) {
        if (options.webOnly) {
          await Android.openWebProjectAsync({ projectRoot });
        } else {
          await Android.openProjectAsync({ projectRoot, devClient: options.devClient ?? false });
        }
      }
    })(),
    (async () => {
      if (options.ios) {
        if (options.webOnly) {
          await Simulator.openWebProjectAsync({ projectRoot, shouldPrompt: false });
        } else {
          await Simulator.openProjectAsync({
            projectRoot,
            devClient: options.devClient ?? false,
            shouldPrompt: false,
          });
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
