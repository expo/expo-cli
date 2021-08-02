import chalk from 'chalk';
import { Simulator, Versions } from 'xdl';

import Log from '../../log';
import { confirmAsync } from '../../prompts';
import * as ClientUpgradeUtils from '../utils/ClientUpgradeUtils';

type Options = {
  latest?: boolean;
};

export async function actionAsync(options: Options) {
  const forceLatest = !!options.latest;
  const currentSdkConfig = await ClientUpgradeUtils.getExpoSdkConfig(process.cwd());
  const currentSdkVersion = currentSdkConfig ? currentSdkConfig.sdkVersion : undefined;
  const sdkVersions = await Versions.sdkVersionsAsync();
  const latestSdk = await Versions.newestReleasedSdkVersionAsync();
  const currentSdk = sdkVersions[currentSdkVersion!];
  const recommendedClient = ClientUpgradeUtils.getClient('ios', currentSdk);
  const latestClient = ClientUpgradeUtils.getClient('ios', latestSdk.data);

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
      await Simulator.upgradeExpoAsync({ url: latestClient.url, version: latestClient.version })
    ) {
      Log.log('Done!');
    } else {
      Log.error(`Unable to install Expo Go ${latestClient.version} for iOS.`);
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
      await Simulator.upgradeExpoAsync({
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
      await Simulator.upgradeExpoAsync({
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
    platform: 'ios',
  });

  if (availableClients.length === 0) {
    const answer = await confirmAsync({
      message: currentSdk
        ? `We don't have a compatible client for SDK ${currentSdkVersion}. Do you want to try the latest client?`
        : "It looks like we don't have a compatible client. Do you want to try the latest client?",
    });
    if (answer) {
      await Simulator.upgradeExpoAsync({
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

  if (await Simulator.upgradeExpoAsync({ url: targetClient.clientUrl })) {
    Log.log('Done!');
  }
}
