import ora from 'ora';

import { AppleCtx } from './authenticate';
import { runAction, travelingFastlane } from './fastlane';

type Options = {
  enablePushNotifications?: boolean
}

export default async function ensureAppExists(
  appleCtx: AppleCtx, 
  { experienceName, bundleIdentifier }: { experienceName: string, bundleIdentifier: string },
  options: Options = {}
) {
  const { appleId, appleIdPassword, team } = appleCtx;
  const spinner = ora(`Ensuring App ID exists on Apple Developer Portal...`).start();
  try {
    const { created } = await runAction(travelingFastlane.ensureAppExists, [
      ...(options.enablePushNotifications ? ['--push-notifications'] : []),
      appleId,
      appleIdPassword,
      team.id,
      bundleIdentifier,
      experienceName,
    ]);
    if (created) {
      spinner.succeed(`App ID created with bundle identifier ${bundleIdentifier}.`);
    } else {
      spinner.succeed('App ID found on Apple Developer Portal.');
    }
  } catch (err) {
    spinner.fail(
      'Something went wrong when trying to ensure App ID exists on Apple Developer Portal!'
    );
    throw err;
  }
}
