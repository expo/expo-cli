import { Android, BuildType, Job, Platform, sanitizeJob } from '@expo/build-tools';

import AndroidCredentialsProvider, {
  AndroidCredentials,
} from '../../../../credentials/provider/AndroidCredentialsProvider';
import {
  AndroidBuildProfile,
  AndroidGenericBuildProfile,
  AndroidManagedBuildProfile,
  Workflow,
} from '../../../../easJson';
import { ensureCredentialsAsync } from '../credentials';
import { Builder, BuilderContext } from '../types';

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
    // TODO: implement me
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
      gradleCommand: buildProfile.buildCommand,
      artifactPath: buildProfile.artifactPath,
    };
  }

  private async prepareManagedJobAsync(
    archiveUrl: string,
    buildProfile: AndroidManagedBuildProfile
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
