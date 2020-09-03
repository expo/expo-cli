import { Platform } from '@expo/build-tools';
import chalk from 'chalk';
import figures from 'figures';
import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { EasJsonReader } from '../../../easJson';
import { gitAddAsync } from '../../../git';
import log from '../../../log';
import AndroidBuilder from '../build/builders/AndroidBuilder';
import iOSBuilder from '../build/builders/iOSBuilder';
import { BuildCommandPlatform } from '../types';
import createBuilderContext from '../utils/createBuilderContext';
import createCommandContextAsync from '../utils/createCommandContextAsync';
import {
  DirtyGitTreeError,
  ensureGitRepoExistsAsync,
  ensureGitStatusIsCleanAsync,
  reviewAndCommitChangesAsync,
} from '../utils/git';

interface BuildOptions {
  skipCredentialsCheck?: boolean; // noop for now
  parent?: {
    nonInteractive: boolean;
  };
}

async function initAction(projectDir: string, options: BuildOptions): Promise<void> {
  const nonInteractive = options.parent?.nonInteractive === true;

  const spinner = ora('Checking for eas.json file');

  await ensureGitRepoExistsAsync();
  await ensureGitStatusIsCleanAsync();

  const easJsonPath = path.join(projectDir, 'eas.json');
  const easJson = {
    builds: {
      android: {
        release: {
          workflow: 'generic',
        },
      },
      ios: {
        release: {
          workflow: 'generic',
        },
      },
    },
  };

  if (!(await fs.pathExists(easJsonPath))) {
    await fs.writeFile(easJsonPath, `${JSON.stringify(easJson, null, 2)}\n`);
    await gitAddAsync(easJsonPath, { intentToAdd: true });
  }

  try {
    await ensureGitStatusIsCleanAsync();
    spinner.succeed('Found existing eas.json file');
  } catch (err) {
    if (err instanceof DirtyGitTreeError) {
      spinner.succeed('We created a minimal eas.json file');
      log.newLine();

      try {
        await reviewAndCommitChangesAsync('Create minimal eas.json', { nonInteractive });

        log(`${chalk.green(figures.tick)} Successfully committed eas.json.`);
      } catch (e) {
        throw new Error(
          "Aborting, run the command again once you're ready. Make sure to commit any changes you've made."
        );
      }
    } else {
      spinner.fail();
      throw err;
    }
  }

  const commandCtx = await createCommandContextAsync({
    requestedPlatform: BuildCommandPlatform.ALL,
    profile: 'release',
    projectDir,
    trackingCtx: {},
    nonInteractive,
    skipCredentialsCheck: options?.skipCredentialsCheck,
    skipProjectConfiguration: false,
  });

  const easConfig = await new EasJsonReader(
    commandCtx.projectDir,
    commandCtx.requestedPlatform
  ).readAsync(commandCtx.profile);

  const androidCtx = createBuilderContext<Platform.Android>({
    commandCtx,
    platform: Platform.Android,
    easConfig,
  });

  const androidBuilder = new AndroidBuilder(androidCtx);

  await androidBuilder.ensureCredentialsAsync();
  await androidBuilder.configureProjectAsync();

  const iosCtx = createBuilderContext<Platform.iOS>({
    commandCtx,
    platform: Platform.iOS,
    easConfig,
  });

  const iosBuilder = new iOSBuilder(iosCtx);

  await iosBuilder.ensureCredentialsAsync();
  await iosBuilder.configureProjectAsync();
}

export default initAction;
