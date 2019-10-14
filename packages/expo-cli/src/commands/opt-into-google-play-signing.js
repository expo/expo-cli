/* @flow */

import AppSigningOptInProcess from './google-play/AppSigningOptIn';

export default (program: any) => {
  program
    .command('opt-in-google-play-signing [project-dir]')
    .description(
      'Switch from the old method of signing APKs to the new App Signing by Google Play. The APK will be signed with an upload key and after its uploaded it to the store, the app will be re-signed with the key from the original keystore.'
    )
    .asyncActionProjectDir(async (projectDir: string) => {
      const optInProcess = new AppSigningOptInProcess(projectDir);
      await optInProcess.run();
    });
};
