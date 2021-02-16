import { getDefaultTarget } from '@expo/config';
import { Android, ConnectionStatus, ProjectSettings, Simulator, Webpack } from '@expo/xdl';
import { Command } from 'commander';
import indentString from 'indent-string';
import qrcodeTerminal from 'qrcode-terminal';

import CommandError, { AbortCommandError } from './CommandError';
import Log from './log';
import { getDevClientSchemeAsync } from './schemes';

export type URLHostType = 'lan' | 'tunnel' | 'localhost';

// NOTE: if you update this, you should also update assertValidOptions in UrlUtils.ts
export type URLOptions = {
  devClient?: boolean;
  android?: boolean;
  ios?: boolean;
  web?: boolean;
  scheme?: string;
  host?: URLHostType;
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

function assertServingType(options: any) {
  if ([options.host, options.lan, options.localhost, options.tunnel].filter(Boolean).length > 1) {
    throw new CommandError(
      'BAD_ARGS',
      'Specify at most one of --host, --tunnel, --lan, and --localhost'
    );
  }
}

function getHostType(options: any) {
  let hostType = 'lan';

  if (options.offline) {
    hostType = 'localhost';
  }

  if (options.host) {
    return options.host;
  } else if (options.tunnel) {
    return 'tunnel';
  } else if (options.lan) {
    return 'lan';
  } else if (options.localhost) {
    return 'localhost';
  }
  return hostType;
}

async function optsAsync(projectRoot: string, options: any) {
  // Prevent using too many different boolean options together.
  assertServingType(options);
  // Prevent using --dev-client in a managed app.
  assertDevClientOption(projectRoot, options.devClient);

  if (options.offline) {
    // TODO: maybe let people know that we will force localhost with offline?
    ConnectionStatus.setIsOffline(true);
  }

  // Read cached options.
  const opts = await ProjectSettings.readAsync(projectRoot);

  opts.hostType = getHostType(options);

  opts.scheme = await resolveSchemeAsync(projectRoot, options);

  // Cache options.
  await ProjectSettings.setAsync(projectRoot, opts);

  return opts;
}

function assertDevClientOption(projectRoot: string, isDevClient: boolean) {
  // Prevent using --dev-client in a managed app.
  if (isDevClient) {
    const defaultTarget = getDefaultTarget(projectRoot);
    if (defaultTarget !== 'bare') {
      Log.warn(
        `\nOption ${Log.chalk.cyan(
          '--dev-client'
        )} can only be used in bare workflow apps. Run ${Log.chalk.cyan(
          'expo eject'
        )} and try again\n`
      );
      throw new AbortCommandError();
    }
  }
}

async function resolveSchemeAsync(
  projectRoot: string,
  options: { scheme: any; devClient?: boolean }
): Promise<string | null> {
  if (typeof options.scheme === 'string') {
    // Use the custom scheme
    return options.scheme ?? null;
  } else if (options.devClient) {
    // Attempt to find the scheme or warn the user how to setup a custom scheme
    return await getDevClientSchemeAsync(projectRoot);
  }
  // Ensure this is reset when users don't use `--scheme` or `--dev-client`
  return null;
}

function printQRCode(url: string) {
  qrcodeTerminal.generate(url, code => Log.log(`${indentString(code, 1)}\n`));
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
