import type { Command } from 'commander';
import qrcodeTerminal from 'qrcode-terminal';
import {
  Android,
  ConnectionStatus,
  isDevClientPackageInstalled,
  ProjectSettings,
  Simulator,
  Webpack,
} from 'xdl';

import CommandError, { AbortCommandError } from './CommandError';
import Log from './log';
import { getOptionalDevClientSchemeAsync } from './schemes';

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
    opts.scheme = await getOptionalDevClientSchemeAsync(projectRoot);
  } else if (!options.devClient && isDevClientPackageInstalled(projectRoot)) {
    opts.scheme = await getOptionalDevClientSchemeAsync(projectRoot);
  } else {
    // Ensure this is reset when users don't use `--scheme`, `--dev-client` and don't have the `expo-dev-client` package installed.
    opts.scheme = null;
  }

  await ProjectSettings.setAsync(projectRoot, opts);

  return opts;
}

function printQRCode(url: string) {
  qrcodeTerminal.generate(url, { small: true }, code => Log.log(code));
}

async function handleMobileOptsAsync(
  projectRoot: string,
  options: Pick<URLOptions, 'devClient' | 'ios' | 'android' | 'web'> & { webOnly?: boolean }
) {
  const results = await Promise.all([
    (async () => {
      if (options.android) {
        if (options.webOnly) {
          return await Android.openWebProjectAsync({ projectRoot });
        } else {
          return await Android.openProjectAsync({
            projectRoot,
            devClient: options.devClient ?? false,
          });
        }
      }
      return null;
    })(),
    (async () => {
      if (options.ios) {
        if (options.webOnly) {
          return await Simulator.openWebProjectAsync({ projectRoot, shouldPrompt: false });
        } else {
          return await Simulator.openProjectAsync({
            projectRoot,
            devClient: options.devClient ?? false,
            shouldPrompt: false,
          });
        }
      }
      return null;
    })(),
    (async () => {
      if (options.web) {
        return await Webpack.openAsync(projectRoot);
      }
      return null;
    })(),
  ]);

  const errors = results
    .reduce<(string | Error)[]>((prev, curr) => {
      if (curr && !curr.success) {
        return prev.concat([curr.error]);
      }
      return prev;
    }, [])
    .filter(Boolean);

  if (errors.length) {
    // ctrl+c
    const isEscapedError = errors.some(error => error === 'escaped');
    if (isEscapedError) {
      throw new AbortCommandError();
    } else {
      if (typeof errors[0] === 'string') {
        // Throw the first error
        throw new CommandError(errors[0]);
      }
      throw errors[0];
    }
  }

  return !!options.android || !!options.ios;
}

export default {
  addOptions,
  handleMobileOptsAsync,
  printQRCode,
  optsAsync,
};
