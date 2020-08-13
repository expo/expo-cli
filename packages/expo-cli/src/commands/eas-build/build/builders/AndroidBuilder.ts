import { Android, BuildType, Job, Platform, sanitizeJob } from '@expo/build-tools';
import chalk from 'chalk';
import figures from 'figures';
import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';

import AndroidCredentialsProvider, {
  AndroidCredentials,
} from '../../../../credentials/provider/AndroidCredentialsProvider';
import {
  AndroidBuildProfile,
  AndroidGenericBuildProfile,
  AndroidManagedBuildProfile,
  Workflow,
} from '../../../../easJson';
import log from '../../../../log';
import { ensureCredentialsAsync } from '../credentials';
import gradleContent from '../templates/gradleContent';
import { Builder, BuilderContext } from '../types';
import * as gitUtils from '../utils/git';

interface CommonJobProperties {
  platform: Platform.Android;
  projectUrl: string;
  secrets?: {
    keystore: Android.Keystore;
  };
}

class AndroidBuilder implements Builder {
  private credentials?: AndroidCredentials;
  private buildProfile: AndroidBuildProfile;
  private credentialsPrepared: boolean = false;

  constructor(public readonly ctx: BuilderContext) {
    if (!ctx.eas.builds.android) {
      throw new Error("missing android configuration, shouldn't happen");
    }
    this.buildProfile = ctx.eas.builds.android;
  }

  public async ensureCredentialsAsync(): Promise<void> {
    this.credentialsPrepared = true;
    if (!this.shouldLoadCredentials()) {
      return;
    }
    const provider = new AndroidCredentialsProvider(this.ctx.projectDir, {
      projectName: this.ctx.projectName,
      accountName: this.ctx.accountName,
    });
    await provider.initAsync();
    const credentialsSource = await ensureCredentialsAsync(
      provider,
      this.buildProfile.workflow,
      this.buildProfile.credentialsSource,
      this.ctx.nonInteractive
    );
    this.credentials = await provider.getCredentialsAsync(credentialsSource);
  }

  public async configureProjectAsync(): Promise<void> {
    const spinner = ora('Making sure your Android project is set up properly');

    const { projectDir } = this.ctx;

    const androidAppDir = path.join(projectDir, 'android', 'app');
    const buildGradlePath = path.join(androidAppDir, 'build.gradle');
    const easGradlePath = path.join(androidAppDir, 'eas-build.gradle');

    await fs.writeFile(easGradlePath, gradleContent);
    await gitUtils.addFileAsync(easGradlePath, { intentToAdd: true });

    const buildGradleContent = await fs.readFile(path.join(buildGradlePath), 'utf-8');
    const applyEasGradle = 'apply from: "./eas-build.gradle"';

    const isAlreadyConfigured = buildGradleContent
      .split('\n')
      // Check for both single and double quotes
      .some(line => line === applyEasGradle || line === applyEasGradle.replace(/"/g, "'"));

    if (!isAlreadyConfigured) {
      await fs.writeFile(buildGradlePath, `${buildGradleContent.trim()}\n${applyEasGradle}\n`);
    }

    try {
      await gitUtils.ensureGitStatusIsCleanAsync();
      spinner.succeed();
    } catch (err) {
      if (err instanceof gitUtils.DirtyGitTreeError) {
        spinner.succeed('We configured your Android project to build it on the Expo servers');
        log.newLine();

        try {
          await gitUtils.reviewAndCommitChangesAsync('Configure Android project', {
            nonInteractive: this.ctx.nonInteractive,
          });

          log(`${chalk.green(figures.tick)} Successfully committed the configuration changes.`);
        } catch (e) {
          throw new Error(
            "Aborting, run the build command once you're ready. Make sure to commit any changes you've made."
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
    if (this.buildProfile.workflow === Workflow.Generic) {
      return sanitizeJob(await this.prepareGenericJobAsync(archiveUrl, this.buildProfile));
    } else if (this.buildProfile.workflow === Workflow.Managed) {
      return sanitizeJob(await this.prepareManagedJobAsync(archiveUrl, this.buildProfile));
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
    return {
      ...(await this.prepareJobCommonAsync(archiveUrl)),
      type: BuildType.Generic,
      gradleCommand: buildProfile.gradleCommand,
      artifactPath: buildProfile.artifactPath,
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
      this.buildProfile.workflow === Workflow.Managed ||
      (this.buildProfile.workflow === Workflow.Generic && !this.buildProfile.withoutCredentials)
    );
  }
}

export default AndroidBuilder;
