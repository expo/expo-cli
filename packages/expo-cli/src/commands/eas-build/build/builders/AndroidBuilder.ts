import { Android, BuildType, Job, Platform, sanitizeJob } from '@expo/eas-build-job';
import fs from 'fs-extra';
import path from 'path';

import CommandError from '../../../../CommandError';
import { readSecretEnvsAsync } from '../../../../credentials/credentialsJson/read';
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
import { Builder, BuilderContext } from '../../types';
import {
  configureUpdatesAndroidAsync,
  setUpdatesVersionsAndroidAsync,
} from '../../utils/expoUpdates';
import { modifyAndCommitAsync } from '../../utils/git';
import { ensureCredentialsAsync } from '../credentials';
import gradleContent from '../templates/gradleContent';

interface CommonJobProperties {
  platform: Platform.Android;
  projectUrl: string;
  secrets: {
    buildCredentials?: {
      keystore: Android.Keystore;
    };
    secretEnvs?: Record<string, string>;
  };
}

function hasApplyLine(content: string, applyLine: string) {
  return (
    content
      .split('\n')
      // Check for both single and double quotes
      .some(line => line === applyLine || line === applyLine.replace(/"/g, "'"))
  );
}

class AndroidBuilder implements Builder<Platform.Android> {
  private credentials?: AndroidCredentials;
  private secretEnvs?: Record<string, string>;
  private credentialsPrepared: boolean = false;

  constructor(public readonly ctx: BuilderContext<Platform.Android>) {}

  public async setupAsync(): Promise<void> {}

  public async ensureCredentialsAsync(): Promise<
    CredentialsSource.LOCAL | CredentialsSource.REMOTE | undefined
  > {
    this.credentialsPrepared = true;
    this.secretEnvs = await readSecretEnvsAsync(this.ctx.commandCtx.projectDir);

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

    const hasEasGradleApply = hasApplyLine(buildGradleContent, applyEasGradle);

    return hasEasGradleApply && hasEasGradleFile;
  }

  public async ensureProjectConfiguredAsync(): Promise<void> {
    const { projectDir, exp, nonInteractive } = this.ctx.commandCtx;

    const isProjectConfigured = await this.isProjectConfiguredAsync();

    if (!isProjectConfigured) {
      throw new CommandError(
        'Project is not configured. Please run "expo eas:build:init" first to configure the project'
      );
    }

    await modifyAndCommitAsync(
      async () => {
        await setUpdatesVersionsAndroidAsync({ projectDir, exp });
      },
      {
        startMessage: 'Making sure runtime version is correct on Android',
        commitMessage: 'Set runtime version in Android project',
        commitSuccessMessage: 'Successfully committed the configuration changes',
        successMessage: 'We updated the runtime version in your Android project',
        nonInteractive,
      }
    );
  }

  public async configureProjectAsync(): Promise<void> {
    const { projectDir, exp, nonInteractive } = this.ctx.commandCtx;

    await modifyAndCommitAsync(
      async () => {
        const androidAppDir = path.join(projectDir, 'android', 'app');
        const buildGradlePath = path.join(androidAppDir, 'build.gradle');
        const easGradlePath = path.join(androidAppDir, 'eas-build.gradle');

        await fs.writeFile(easGradlePath, gradleContent);
        await gitAddAsync(easGradlePath, { intentToAdd: true });

        const buildGradleContent = await fs.readFile(path.join(buildGradlePath), 'utf-8');
        const applyEasGradle = 'apply from: "./eas-build.gradle"';

        const hasEasGradleApply = hasApplyLine(buildGradleContent, applyEasGradle);

        if (!hasEasGradleApply) {
          await fs.writeFile(buildGradlePath, `${buildGradleContent.trim()}\n${applyEasGradle}\n`);
        }

        await configureUpdatesAndroidAsync({ projectDir, exp });
      },
      {
        startMessage: 'Configuring the Android project',
        commitMessage: 'Configure Android project',
        commitSuccessMessage: 'Successfully committed the configuration changes',
        successMessage: 'We configured your Android project to build it on the Expo servers',
        nonInteractive,
      }
    );
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
    const buildCredentials = this.credentials
      ? {
          buildCredentials: {
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
      secrets: {
        ...(this.secretEnvs ? { secretEnvs: this.secretEnvs } : {}),
        ...buildCredentials,
      },
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
      releaseChannel: buildProfile.releaseChannel,
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
