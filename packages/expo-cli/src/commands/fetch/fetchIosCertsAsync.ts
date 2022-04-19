import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';

import CommandError from '../../CommandError';
import { Context } from '../../credentials/context';
import Log from '../../log';
import { getOrPromptForBundleIdentifier } from '../utils/getOrPromptApplicationId';

export async function actionAsync(projectRoot: string): Promise<void> {
  const inProjectDir = (filename: string): string => path.resolve(projectRoot, filename);

  const bundleIdentifier = await getOrPromptForBundleIdentifier(projectRoot);

  try {
    const ctx = new Context();
    await ctx.init(projectRoot);

    const app = {
      accountName: ctx.projectOwner,
      projectName: ctx.manifest.slug,
      bundleIdentifier,
    };
    Log.log(
      `Retrieving iOS credentials for @${app.accountName}/${app.projectName} (${bundleIdentifier})`
    );
    const appCredentials = await ctx.ios.getAppCredentials(app);
    const pushCredentials = await ctx.ios.getPushKey(app);
    const distCredentials = await ctx.ios.getDistCert(app);

    const { certP12, certPassword, certPrivateSigningKey } = distCredentials ?? {};
    const { apnsKeyId, apnsKeyP8 } = pushCredentials ?? {};
    const { pushP12, pushPassword, provisioningProfile, teamId } =
      appCredentials?.credentials ?? {};

    if (teamId !== undefined) {
      Log.log(`These credentials are associated with Apple Team ID: ${teamId}`);
    }
    if (certP12) {
      const distPath = inProjectDir(`${app.projectName}_dist.p12`);
      await fs.writeFile(distPath, Buffer.from(certP12, 'base64'));
    }
    if (certPrivateSigningKey) {
      const distPrivateKeyPath = inProjectDir(`${app.projectName}_dist_cert_private.key`);
      await fs.writeFile(distPrivateKeyPath, certPrivateSigningKey);
    }
    if (certP12 || certPrivateSigningKey) {
      Log.log('Wrote distribution cert credentials to disk.');
    }
    if (apnsKeyP8) {
      const apnsKeyP8Path = inProjectDir(`${app.projectName}_apns_key.p8`);
      await fs.writeFile(apnsKeyP8Path, apnsKeyP8);
      Log.log('Wrote push key credentials to disk.');
    }
    if (pushP12) {
      const pushPath = inProjectDir(`${app.projectName}_push.p12`);
      await fs.writeFile(pushPath, Buffer.from(pushP12, 'base64'));
    }
    if (pushP12) {
      Log.log('Wrote push cert credentials to disk.');
    }
    if (provisioningProfile) {
      const provisioningProfilePath = path.resolve(
        projectRoot,
        `${app.projectName}.mobileprovision`
      );
      await fs.writeFile(provisioningProfilePath, Buffer.from(provisioningProfile, 'base64'));
      Log.log('Wrote provisioning profile to disk');
    }
    Log.log(`Save these important values as well:

Distribution P12 password: ${
      certPassword ? chalk.bold(certPassword) : chalk.yellow('(not available)')
    }
Push Key ID:               ${apnsKeyId ? chalk.bold(apnsKeyId) : chalk.yellow('(not available)')}
Push P12 password:         ${
      pushPassword ? chalk.bold(pushPassword) : chalk.yellow('(not available)')
    }
`);
  } catch {
    throw new CommandError(
      'Unable to fetch credentials for this project. Are you sure they exist?'
    );
  }

  Log.log('All done!');
}
