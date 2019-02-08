/* @flow */

import AppSignigOptInProcess from './google-play/AppSigningOptIn';

export default (program: any) => {
  program
    .command('opt-in-google-play-signing [project-dir]')
    .description(
      'Switch from old method of signing APKs to App Signing by Google Play. APK will be signed with upload key and after uploading to store signature will be stripped and app will be signed with key from original keystore.'
    )
    .asyncActionProjectDir(async (projectDir: string, options: any) => {
      const optInProcess = new AppSignigOptInProcess(projectDir, options);
      await optInProcess.run();
    });
};
