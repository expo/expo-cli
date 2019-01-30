import ora from 'ora';

import { runAction, travelingFastlane } from './fastlane';

export default async function ensureAppExists(appleCtx, experienceName) {
  const { appleId, appleIdPassword, team, bundleIdentifier } = appleCtx;
  const spinner = ora(`Ensuring App ID exists on Apple Developer Portal...`).start();
  try {
    await runAction(travelingFastlane.ensureAppExists, [
      appleId,
      appleIdPassword,
      team.id,
      bundleIdentifier,
      experienceName,
    ]);
    spinner.succeed('Ensured App ID exists on Apple Developer Portal!');
  } catch (err) {
    spinner.fail(
      'Something went wrong when trying to ensure App ID exists on Apple Developer Portal!'
    );
    throw err;
  }
}
