import { BundleId, CapabilityType, CapabilityTypeOption } from '@expo/apple-utils';
import chalk from 'chalk';

import { ora } from '../utils/ora';
import { AppleCtx, getRequestContext } from './authenticate';
import { assertContractMessagesAsync } from './contractMessages';

export interface EnsureAppExistsOptions {
  enablePushNotifications?: boolean;
}

export interface AppLookupParams {
  accountName: string;
  projectName: string;
  bundleIdentifier: string;
}

export async function ensureBundleIdExistsAsync(
  authCtx: AppleCtx,
  { accountName, projectName, bundleIdentifier }: AppLookupParams,
  options?: EnsureAppExistsOptions
) {
  return ensureBundleIdExistsWithNameAsync(
    authCtx,
    {
      name: `@${accountName}/${projectName}`,
      bundleIdentifier,
    },
    options
  );
}

export async function ensureBundleIdExistsWithNameAsync(
  authCtx: AppleCtx,
  { name, bundleIdentifier }: { name: string; bundleIdentifier: string },
  options?: EnsureAppExistsOptions
) {
  const context = getRequestContext(authCtx);
  let spinner = ora(`Linking bundle identifier ${chalk.dim(bundleIdentifier)}`).start();

  let bundleId: BundleId | null;
  try {
    // Get the bundle id
    bundleId = await BundleId.findAsync(context, { identifier: bundleIdentifier });

    if (!bundleId) {
      spinner.text = `Registering bundle identifier ${chalk.dim(bundleIdentifier)}`;
      // If it doesn't exist, create it
      bundleId = await BundleId.createAsync(context, {
        name,
        identifier: bundleIdentifier,
      });
    }
    spinner.succeed(`Bundle identifier registered ${chalk.dim(bundleIdentifier)}`);
  } catch (err) {
    if (err.message.match(/An App ID with Identifier '(.*)' is not available/)) {
      spinner.fail(
        `The bundle identifier ${chalk.bold(bundleIdentifier)} is not available to team "${
          authCtx.team.name
        }" (${authCtx.team.id}), please change it in your app config and try again.`
      );
    } else {
      spinner.fail(`Failed to register bundle identifier ${chalk.dim(bundleIdentifier)}`);

      // Assert contract errors for easier resolution when the user has an expired developer account.
      if (err.message.match(/forbidden for security reasons/)) {
        await assertContractMessagesAsync(context);
      }
    }

    throw err;
  }

  if (options) {
    try {
      spinner = ora(`Syncing capabilities`).start();

      // Update the capabilities
      await bundleId.updateBundleIdCapabilityAsync({
        capabilityType: CapabilityType.PUSH_NOTIFICATIONS,
        option: options.enablePushNotifications
          ? CapabilityTypeOption.ON
          : CapabilityTypeOption.OFF,
        // TODO: Add more capabilities
      });
      spinner.succeed(`Synced capabilities`);
    } catch (err) {
      spinner.fail(`Failed to sync capabilities ${chalk.dim(bundleIdentifier)}`);

      throw err;
    }
  }
}
