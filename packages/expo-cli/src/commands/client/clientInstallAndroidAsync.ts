import chalk from 'chalk';
import { Android, Versions } from 'xdl';

import Log from '../../log';
import { confirmAsync } from '../../prompts';
import { resolveDeviceAsync } from '../run/android/resolveDeviceAsync';
import * as ClientUpgradeUtils from '../utils/ClientUpgradeUtils';

type Options = {
  latest?: boolean;
  device?: boolean | string;
};

export async function actionAsync(options: Options) {
  const device = await resolveDeviceAsync(options.device);
  const forceLatest = !!options.latest;
  const currentSdkConfig = await ClientUpgradeUtils.getExpoSdkConfig(process.cwd());
  const currentSdkVersion = currentSdkConfig ? currentSdkConfig.sdkVersion : undefined;
  const sdkVersions = await Versions.sdkVersionsAsync();
  const latestSdk = await Versions.newestReleasedSdkVersionAsync();
  const currentSdk = sdkVersions[currentSdkVersion!];
  const recommendedClient = ClientUpgradeUtils.getClient('android', currentSdk);
  const latestClient = ClientUpgradeUtils.getClient('android', latestSdk.data);

  if (forceLatest) {
    if (!latestClient?.url) {
      Log.error(
        `Unable to find latest client version. Check your internet connection or run this command again without the ${chalk.bold(
          '--latest'
        )} flag.`
      );
      return;
    }

    if (
      await Android.upgradeExpoAsync({
        device,
        url: latestClient.url,
        version: latestClient.version,
      })
    ) {
      Log.log('Done!');
    } else {
      Log.error(`Unable to install Expo Go ${latestClient.version} for Android.`);
    }

    return;
  }

  if (!currentSdkVersion) {
    Log.log(
      'Could not find your Expo project. If you run this from a project, we can help pick the right Expo Go version!'
    );
  }

  if (currentSdk && !recommendedClient) {
    Log.log(
      `You are currently using SDK ${currentSdkVersion}. Unfortunately, we couldn't detect the proper client version for this SDK.`
    );
  }

  if (currentSdk && recommendedClient) {
    const recommendedClientVersion = recommendedClient.version || 'version unknown';
    const answer = await confirmAsync({
      message: `You are currently using SDK ${currentSdkVersion}. Would you like to install client ${recommendedClientVersion} released for this SDK?`,
    });
    if (answer) {
      await Android.upgradeExpoAsync({
        device,
        url: recommendedClient.url,
        version: recommendedClient.version,
      });
      Log.log('Done!');
      return;
    }
  } else {
    const answer = await confirmAsync({
      message: latestClient?.version
        ? chalk`Do you want to install the latest client? {dim (${latestClient.version})}`
        : 'Do you want to install the latest client?',
    });
    if (answer) {
      await Android.upgradeExpoAsync({
        device,
        url: latestClient?.url,
        version: latestClient?.version,
      });
      Log.log('Done!');
      return;
    }
  }

  const availableClients = ClientUpgradeUtils.getAvailableClients({
    sdkVersions,
    project: currentSdkConfig,
    platform: 'android',
  });

  if (availableClients.length === 0) {
    const answer = await confirmAsync({
      message: currentSdk
        ? `We don't have a compatible client for SDK ${currentSdkVersion}. Do you want to try the latest client?`
        : "It looks like we don't have a compatible client. Do you want to try the latest client?",
    });
    if (answer) {
      await Android.upgradeExpoAsync({
        device,
        url: latestClient?.url,
        version: latestClient?.version,
      });
      Log.log('Done!');
    } else {
      Log.log('No client to install');
    }
    return;
  }

  const targetClient = await ClientUpgradeUtils.askClientToInstall({
    currentSdkVersion,
    latestSdkVersion: latestSdk.version,
    clients: availableClients,
  });

  if (await Android.upgradeExpoAsync({ device, url: targetClient.clientUrl })) {
    Log.log('Done!');
  }
}
