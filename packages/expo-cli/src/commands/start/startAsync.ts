import { UnifiedAnalytics } from '@expo/api';
import { ConfigError, ExpoConfig, getConfig, isLegacyImportsEnabled } from '@expo/config';
import chalk from 'chalk';
import path from 'path';
import resolveFrom from 'resolve-from';
import { LoadingPageHandler, Project, UrlUtils, Versions } from 'xdl';

import StatusEventEmitter from '../../analytics/StatusEventEmitter';
import getDevClientProperties from '../../analytics/getDevClientProperties';
import Log from '../../log';
import { assertProjectHasExpoExtensionFilesAsync } from '../utils/deprecatedExtensionWarnings';
import { profileMethod } from '../utils/profileMethod';
import * as sendTo from '../utils/sendTo';
import { ensureTypeScriptSetupAsync } from '../utils/typescript/ensureTypeScriptSetup';
import urlOpts from '../utils/urlOpts';
import { validateDependenciesVersionsAsync } from '../utils/validateDependenciesVersions';
import { ensureWebSupportSetupAsync } from '../utils/web/ensureWebSetup';
import * as TerminalUI from './TerminalUI';
import { installCustomExitHook, installExitHooks } from './installExitHooks';
import { tryOpeningDevToolsAsync } from './openDevTools';
import { NormalizedOptions, parseStartOptions } from './parseStartOptions';

export async function actionAsync(projectRoot: string, options: NormalizedOptions): Promise<void> {
  Log.log(chalk.gray(`Starting project at ${projectRoot}`));

  // Add clean up hooks
  installExitHooks(projectRoot);

  // Only validate expo in Expo Go contexts
  if (!options.devClient) {
    // Find expo binary in project/workspace node_modules
    const hasExpoInstalled = resolveFrom.silent(projectRoot, 'expo');
    if (!hasExpoInstalled) {
      throw new ConfigError(
        `Unable to find expo in this project - have you run yarn / npm install yet?`,
        'MODULE_NOT_FOUND'
      );
    }
  }

  const { exp, pkg } = profileMethod(getConfig)(projectRoot, {
    skipSDKVersionRequirement: options.webOnly || options.devClient,
  });

  if (options.web || options.webOnly) {
    await ensureWebSupportSetupAsync(projectRoot);
  }

  if (options.devClient) {
    track(projectRoot, exp);
  }

  // Assert various random things
  // TODO: split up this method
  await profileMethod(urlOpts.optsAsync)(projectRoot, options);

  // TODO: This is useless on mac, check if useless on win32
  const rootPath = path.resolve(projectRoot);

  // Optionally open the developer tools UI.
  await profileMethod(tryOpeningDevToolsAsync)(rootPath, {
    exp,
    options,
  });

  if (Versions.gteSdkVersion(exp, '34.0.0')) {
    await profileMethod(ensureTypeScriptSetupAsync)(projectRoot);
  }

  if (!options.webOnly) {
    // TODO: only validate dependencies if starting in managed workflow
    await profileMethod(validateDependenciesVersionsAsync)(projectRoot, exp, pkg);
    // Warn about expo extensions.
    if (!isLegacyImportsEnabled(exp)) {
      // Adds a few seconds in basic projects so we should
      // drop this in favor of the upgrade version as soon as possible.
      await profileMethod(assertProjectHasExpoExtensionFilesAsync)(projectRoot);
    }
  }

  const startOptions = profileMethod(parseStartOptions)(options, exp);
  LoadingPageHandler.setOnDeepLink(
    async (projectRoot: string, isDevClient: boolean, platform: string | null) => {
      if (!isDevClient) {
        return;
      }

      const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
      StatusEventEmitter.once('deviceLogReceive', () => {
        // Send the 'ready' event once the app is running in a device.
        UnifiedAnalytics.logEvent('dev client start command', {
          status: 'ready',
          platform,
          ...getDevClientProperties(projectRoot, exp),
        });
      });

      UnifiedAnalytics.logEvent('dev client start command', {
        status: 'started',
        platform,
        ...getDevClientProperties(projectRoot, exp),
      });
    }
  );
  await profileMethod(Project.startAsync)(rootPath, { ...startOptions, exp });

  // Send to option...
  const url = await profileMethod(
    UrlUtils.constructDeepLinkAsync,
    'UrlUtils.constructDeepLinkAsync'
  )(projectRoot).catch(error => {
    // TODO: Maybe there's a better way to do this
    if (!options.devClient || error.code !== 'NO_DEV_CLIENT_SCHEME') {
      throw error;
    }
    return null;
  });

  if (options.sendTo) {
    if (url) {
      const recipient = await profileMethod(sendTo.getRecipient)(options.sendTo);
      if (recipient) {
        await sendTo.sendUrlAsync(url, recipient);
      }
    } else {
      Log.warn('Cannot send URL because the linking URI cannot be resolved');
    }
  }

  // Open project on devices.
  await profileMethod(urlOpts.handleMobileOptsAsync)(projectRoot, options);

  // Present the Terminal UI.
  const isTerminalUIEnabled = !options.nonInteractive && !exp.isDetached;

  if (isTerminalUIEnabled) {
    await profileMethod(TerminalUI.startAsync, 'TerminalUI.startAsync')(projectRoot, startOptions);
  } else if (url) {
    if (!exp.isDetached) {
      Log.newLine();
      urlOpts.printQRCode(url);
    }
    Log.log(`Your native app is running at ${chalk.underline(url)}`);
  }

  // Final note about closing the server.
  if (!options.webOnly) {
    Log.nested(`Logs for your project will appear below. ${chalk.dim(`Press Ctrl+C to exit.`)}`);
  } else {
    Log.nested(
      `\nLogs for your project will appear in the browser console. ${chalk.dim(
        `Press Ctrl+C to exit.`
      )}`
    );
  }
  if (options.devClient) {
    UnifiedAnalytics.logEvent('dev client start command', {
      status: 'ready',
      ...getDevClientProperties(projectRoot, exp),
    });
  }
}

function track(projectRoot: string, exp: ExpoConfig) {
  UnifiedAnalytics.logEvent('dev client start command', {
    status: 'started',
    ...getDevClientProperties(projectRoot, exp),
  });
  installCustomExitHook(() => {
    UnifiedAnalytics.logEvent('dev client start command', {
      status: 'finished',
      ...getDevClientProperties(projectRoot, exp),
    });
    UnifiedAnalytics.flush();
  });
}
