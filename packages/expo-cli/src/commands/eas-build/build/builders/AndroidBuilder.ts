import { AndroidConfig } from '@expo/config-plugins';
import { Android, Job, Platform, sanitizeJob, Workflow } from '@expo/eas-build-job';
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
} from '../../../../easJson';
import { gitAddAsync, gitRootDirectory } from '../../../../git';
import { Builder, BuilderContext } from '../../types';
import {
  configureUpdatesAsync,
  syncUpdatesConfigurationAsync,
} from '../../utils/expoUpdates/android';
import { isExpoUpdatesInstalled } from '../../utils/expoUpdates/common';
import { modifyAndCommitAsync } from '../../utils/git';
import { ensureCredentialsAsync } from '../credentials';

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
      {
        nonInteractive: this.ctx.commandCtx.nonInteractive,
        skipCredentialsCheck: this.ctx.commandCtx.skipCredentialsCheck,
      }
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

  public async ensureProjectConfiguredAsync(): Promise<void> {
    const { projectDir, exp, nonInteractive } = this.ctx.commandCtx;

    const isProjectConfigured = await AndroidConfig.EasBuild.isEasBuildGradleConfiguredAsync(
      projectDir
    );
    if (!isProjectConfigured) {
      throw new CommandError(
        'Project is not configured. Please run "expo eas:build:init" first to configure the project'
      );
    }

    await modifyAndCommitAsync(
      async () => {
        if (isExpoUpdatesInstalled(projectDir)) {
          await syncUpdatesConfigurationAsync(projectDir, exp);
        }
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
        await AndroidConfig.EasBuild.configureEasBuildAsync(projectDir);
        const easGradlePath = AndroidConfig.EasBuild.getEasBuildGradlePath(projectDir);
        await gitAddAsync(easGradlePath, { intentToAdd: true });

        if (isExpoUpdatesInstalled(projectDir)) {
          await configureUpdatesAsync(projectDir, exp);
        }
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
      type: Workflow.Generic,
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
    const projectRootDirectory = path.relative(await gitRootDirectory(), process.cwd()) || '.';
    return {
      ...(await this.prepareJobCommonAsync(archiveUrl)),
      type: Workflow.Managed,
      projectRootDirectory,
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
