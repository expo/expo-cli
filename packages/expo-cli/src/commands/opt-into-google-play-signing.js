/* @flow */

import AppSigningOptInProcess from './google-play/AppSigningOptIn';

export default (program: any) => {
  program
    .command('opt-in-google-play-signing [project-dir]')
    .description(
      'Switch from the old method of signing APKs to the new App Signing by Google Play. The APK will be signed with an upload key and after uploading to it to the store, app will be re-signed with the key from the original keystore.'
    )
    .asyncActionProjectDir(async (projectDir: string, options: any) => {
      const optInProcess = new AppSignigOptInProcess(projectDir, options);
      await optInProcess.run();
    });
};
