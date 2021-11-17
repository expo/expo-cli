import chalk from 'chalk';
import terminalLink from 'terminal-link';

import Log from '../../log';
import { learnMore } from '../utils/TerminalLink';
import { PrebuildResults } from './prebuildAppAsync';

export function logNextSteps({
  hasAssetBundlePatterns,
  hasNewProjectFiles,
  legacyUpdates,
  platforms,
  podInstall,
  nodeInstall,
  packageManager,
}: PrebuildResults) {
  Log.newLine();
  Log.nested(`➡️  ${chalk.bold('Next steps')}`);

  // Log a warning about needing to install node modules
  if (nodeInstall) {
    const installCmd = packageManager === 'npm' ? 'npm install' : 'yarn';
    Log.nested(`\u203A ⚠️  Install node modules: ${Log.chalk.bold(installCmd)}`);
  }
  if (podInstall) {
    Log.nested(
      `\u203A 🍫 When CocoaPods is installed, initialize the project workspace: ${chalk.bold(
        'npx pod-install'
      )}`
    );
  }
  Log.nested(
    `\u203A 💡 You may want to run ${chalk.bold(
      'npx @react-native-community/cli doctor'
    )} to help install any tools that your app may need to run your native projects.`
  );
  Log.nested(
    `\u203A 🔑 Download your Android keystore (if you're not sure if you need to, just run the command and see): ${chalk.bold(
      'expo fetch:android:keystore'
    )}`
  );

  if (hasAssetBundlePatterns) {
    Log.nested(
      `\u203A 📁 The property ${chalk.bold(
        `assetBundlePatterns`
      )} does not have the same effect in the bare workflow.\n  ${Log.chalk.dim(
        learnMore('https://docs.expo.dev/bare/updating-your-app/#embedding-assets')
      )}`
    );
  }

  if (legacyUpdates) {
    Log.nested(
      `\u203A 🚀 ${
        (terminalLink(
          'expo-updates',
          'https://github.com/expo/expo/blob/master/packages/expo-updates/README.md'
        ),
        {
          fallback: (text: string) => text,
        })
      } has been configured in your project. Before you do a release build, make sure you run ${chalk.bold(
        'expo publish'
      )}. ${Log.chalk.dim(learnMore('https://expo.fyi/release-builds-with-expo-updates'))}`
    );
  }

  if (hasNewProjectFiles) {
    Log.newLine();
    Log.nested(`☑️  ${chalk.bold('When you are ready to run your project')}`);
    Log.nested(
      'To compile and run your project in development, execute one of the following commands:'
    );

    if (platforms.includes('ios')) {
      Log.nested(`\u203A ${chalk.bold(packageManager === 'npm' ? 'npm run ios' : 'yarn ios')}`);
    }

    if (platforms.includes('android')) {
      Log.nested(
        `\u203A ${chalk.bold(packageManager === 'npm' ? 'npm run android' : 'yarn android')}`
      );
    }

    Log.nested(`\u203A ${chalk.bold(packageManager === 'npm' ? 'npm run web' : 'yarn web')}`);
  }
}
