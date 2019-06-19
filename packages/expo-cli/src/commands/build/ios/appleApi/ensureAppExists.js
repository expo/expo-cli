import ora from 'ora';

import { runAction, travelingFastlane } from './fastlane';

export default async function ensureAppExists(appleCtx, options = {}) {
  const { appleId, appleIdPassword, team, bundleIdentifier, experienceName } = appleCtx;
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
