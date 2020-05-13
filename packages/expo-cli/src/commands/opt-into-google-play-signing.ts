import { Command } from 'commander';
import AppSigningOptInProcess from './google-play/AppSigningOptIn';

export default function (program: Command) {
  program
    .command('opt-in-google-play-signing [project-dir]')
    .description(
      'Switch from the old method of signing APKs to the new App Signing by Google Play. The APK will be signed with an upload key and after uploading it to the store, app will be re-signed with the key from the original keystore.'
    )
    .asyncActionProjectDir(
      async (projectDir: string) => {
        const optInProcess = new AppSigningOptInProcess(projectDir);
        await optInProcess.run();
      },
      { checkConfig: true }
    );
}
