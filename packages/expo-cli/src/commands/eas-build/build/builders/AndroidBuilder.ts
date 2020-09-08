import { Android, BuildType, Job, Platform, sanitizeJob } from '@expo/build-tools';
import chalk from 'chalk';
import figures from 'figures';
import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';

import CommandError from '../../../../CommandError';
import AndroidCredentialsProvider, {
  AndroidCredentials,
} from '../../../../credentials/provider/AndroidCredentialsProvider';
import {
  AndroidGenericBuildProfile,
  AndroidManagedBuildProfile,
  CredentialsSource,
  Workflow,
} from '../../../../easJson';
import { gitAddAsync, gitRootDirectory } from '../../../../git';
import log from '../../../../log';
import { Builder, BuilderContext } from '../../types';
import * as gitUtils from '../../utils/git';
import { ensureCredentialsAsync } from '../credentials';
import gradleContent from '../templates/gradleContent';

interface CommonJobProperties {
  platform: Platform.Android;
  projectUrl: string;
  secrets?: {
    keystore: Android.Keystore;
  };
}

class AndroidBuilder implements Builder<Platform.Android> {
  private credentials?: AndroidCredentials;
  private credentialsPrepared: boolean = false;

  constructor(public readonly ctx: BuilderContext<Platform.Android>) {}

  public async setupAsync(): Promise<void> {}

  public async ensureCredentialsAsync(): Promise<
    CredentialsSource.LOCAL | CredentialsSource.REMOTE | undefined
  > {
    this.credentialsPrepared = true;
    if (!this.shouldLoadCredentials()) {
      return;
    }
    const provider = new AndroidCredentialsProvider(
      this.ctx.commandCtx.projectDir,
      {
        projectName: this.ctx.commandCtx.projectName,
        accountName: this.ctx.commandCtx.accountName,
      },
      { nonInteractive: this.ctx.commandCtx.nonInteractive }
    );
    await provider.initAsync();
    const credentialsSource = await ensureCredentialsAsync(
      provider,
      this.ctx.buildProfile.workflow,
      this.ctx.buildProfile.credentialsSource,
      this.ctx.commandCtx.nonInteractive
    );
    this.credentials = await provider.getCredentialsAsync(credentialsSource);
    return credentialsSource;
  }

  private async isProjectConfiguredAsync(): Promise<boolean> {
    const androidAppDir = path.join(this.ctx.commandCtx.projectDir, 'android', 'app');
    const buildGradlePath = path.join(androidAppDir, 'build.gradle');
    const easGradlePath = path.join(androidAppDir, 'eas-build.gradle');

    const hasEasGradleFile = await fs.pathExists(easGradlePath);

    const buildGradleContent = await fs.readFile(path.join(buildGradlePath), 'utf-8');
    const applyEasGradle = 'apply from: "./eas-build.gradle"';

    const hasEasGradleApply = buildGradleContent
      .split('\n')
      // Check for both single and double quotes
      .some(line => line === applyEasGradle || line === applyEasGradle.replace(/"/g, "'"));

    return hasEasGradleApply && hasEasGradleFile;
  }

  public async ensureProjectConfiguredAsync(): Promise<void> {
    if (!(await this.isProjectConfiguredAsync())) {
      throw new CommandError(
        'Project is not configured. Please run "expo eas:build:init" first to configure the project'
      );
    }
  }

  public async configureProjectAsync(): Promise<void> {
    const spinner = ora('Making sure your Android project is set up properly');

    if (await this.isProjectConfiguredAsync()) {
      spinner.succeed('Android project is already configured');
      return;
    }

    const { projectDir } = this.ctx.commandCtx;

    const androidAppDir = path.join(projectDir, 'android', 'app');
    const buildGradlePath = path.join(androidAppDir, 'build.gradle');
    const easGradlePath = path.join(androidAppDir, 'eas-build.gradle');

    await fs.writeFile(easGradlePath, gradleContent);
    await gitAddAsync(easGradlePath, { intentToAdd: true });

    const buildGradleContent = await fs.readFile(path.join(buildGradlePath), 'utf-8');
    const applyEasGradle = 'apply from: "./eas-build.gradle"';

    await fs.writeFile(buildGradlePath, `${buildGradleContent.trim()}\n${applyEasGradle}\n`);

    try {
      await gitUtils.ensureGitStatusIsCleanAsync();
      spinner.succeed();
    } catch (err) {
      if (err instanceof gitUtils.DirtyGitTreeError) {
        spinner.succeed('We configured your Android project to build it on the Expo servers');
        log.newLine();

        try {
          await gitUtils.reviewAndCommitChangesAsync('Configure Android project', {
            nonInteractive: this.ctx.commandCtx.nonInteractive,
          });

          log(`${chalk.green(figures.tick)} Successfully committed the configuration changes.`);
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
  }

  public async prepareJobAsync(archiveUrl: string): Promise<Job> {
    if (!this.credentialsPrepared) {
      throw new Error('ensureCredentialsAsync should be called before prepareJobAsync');
    }
    if (this.ctx.buildProfile.workflow === Workflow.Generic) {
      return sanitizeJob(await this.prepareGenericJobAsync(archiveUrl, this.ctx.buildProfile));
    } else if (this.ctx.buildProfile.workflow === Workflow.Managed) {
      return sanitizeJob(await this.prepareManagedJobAsync(archiveUrl, this.ctx.buildProfile));
    } else {
      throw new Error("Unknown workflow. Shouldn't happen");
    }
  }

  private async prepareJobCommonAsync(archiveUrl: string): Promise<Partial<CommonJobProperties>> {
    const secrets = this.credentials
      ? {
          secrets: {
            keystore: {
              dataBase64: this.credentials.keystore.keystore,
              keystorePassword: this.credentials.keystore.keystorePassword,
              keyAlias: this.credentials.keystore.keyAlias,
              keyPassword: this.credentials.keystore.keyPassword,
            },
          },
        }
      : {};

    return {
      platform: Platform.Android,
      projectUrl: archiveUrl,
      ...secrets,
    };
  }

  private async prepareGenericJobAsync(
    archiveUrl: string,
    buildProfile: AndroidGenericBuildProfile
  ): Promise<Partial<Android.GenericJob>> {
    const projectRootDirectory = path.relative(await gitRootDirectory(), process.cwd()) || '.';
    return {
      ...(await this.prepareJobCommonAsync(archiveUrl)),
      type: BuildType.Generic,
      gradleCommand: buildProfile.gradleCommand,
      artifactPath: buildProfile.artifactPath,
      projectRootDirectory,
    };
  }

  private async prepareManagedJobAsync(
    archiveUrl: string,
    _buildProfile: AndroidManagedBuildProfile
  ): Promise<Partial<Android.ManagedJob>> {
    return {
      ...(await this.prepareJobCommonAsync(archiveUrl)),
      type: BuildType.Managed,
      packageJson: { example: 'packageJson' },
      manifest: { example: 'manifest' },
    };
  }

  private shouldLoadCredentials(): boolean {
    return (
      this.ctx.buildProfile.workflow === Workflow.Managed ||
      (this.ctx.buildProfile.workflow === Workflow.Generic &&
        !this.ctx.buildProfile.withoutCredentials)
    );
  }
}

export default AndroidBuilder;
