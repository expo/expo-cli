import { BuildType, Job, Platform, iOS, validateJob } from '@expo/build-tools';

import { Keystore } from '../../credentials/credentials';
import { Context } from '../../credentials/context';
import { iOSCredentials, iOSCredentialsProvider } from '../../credentials/provider/ios';
import { ensureCredentialsAsync } from './credentials';
import { Builder, BuilderContext } from './build';
import {
  CredentialsSource,
  Workflow,
  iOSBuildProfile,
  iOSGenericBuildProfile,
  iOSManagedBuildProfile,
} from '../../easJson';

interface CommonJobProperties {
  platform: Platform.iOS;
  projectUrl: string;
  secrets?: {
    provisioningProfileBase64: string;
    distributionCertificate: {
      dataBase64: string;
      password: string;
    };
  };
}

class iOSBuilder implements Builder {
  private credentials?: iOSCredentials;
  private buildProfile: iOSBuildProfile;

  constructor(public readonly ctx: BuilderContext) {
    if (!ctx.eas.builds.ios) {
      throw new Error("missing ios configuration, shouldn't happen");
    }
    this.buildProfile = ctx.eas.builds.ios;
  }

  public async prepareJobAsync(archiveUrl: string): Promise<Job> {
    if (this.buildProfile.workflow === Workflow.Generic) {
      return validateJob(await this.prepareGenericJobAsync(archiveUrl, this.buildProfile));
    } else if (this.buildProfile.workflow === Workflow.Managed) {
      return validateJob(await this.prepareManagedJobAsync(archiveUrl, this.buildProfile));
    } else {
      throw new Error("Unknown workflow. Shouldn't happen");
    }
  }

  public async ensureCredentialsAsync(): Promise<void> {
    if (!this.shouldLoadCredentials()) {
      return;
    }
    const bundleIdentifier = this.ctx.exp?.ios?.bundleIdentifier;
    if (!bundleIdentifier) {
      throw new Error('"expo.ios.bundleIdentifier" field is required in your app.json');
    }
    const provider = new iOSCredentialsProvider(this.ctx.projectDir, {
      projectName: this.ctx.projectName,
      accountName: this.ctx.accountName,
      bundleIdentifier,
    });
    await provider.initAsync();
    await ensureCredentialsAsync(
      provider,
      this.buildProfile.workflow,
      this.buildProfile.credentialsSource
    );
    this.credentials = await provider.getCredentialsAsync();
  }

  private async prepareJobCommonAsync(archiveUrl: string): Promise<Partial<CommonJobProperties>> {
    const secrets = this.credentials
      ? {
          secrets: {
            provisioningProfileBase64: this.credentials.provisioningProfile,
            distributionCertificate: {
              dataBase64: this.credentials.distributionCertificate.certP12,
              password: this.credentials.distributionCertificate.certPassword,
            },
          },
        }
      : {};

    return {
      platform: Platform.iOS,
      projectUrl: archiveUrl,
      ...secrets,
    };
  }

  private async prepareGenericJobAsync(
    archiveUrl: string,
    buildProfile: iOSGenericBuildProfile
  ): Promise<Partial<iOS.GenericJob>> {
    return {
      ...(await this.prepareJobCommonAsync(archiveUrl)),
      type: BuildType.Generic,
    };
  }

  private async prepareManagedJobAsync(
    archiveUrl: string,
    buildProfile: iOSManagedBuildProfile
  ): Promise<Partial<iOS.ManagedJob>> {
    return {
      ...(await this.prepareJobCommonAsync(archiveUrl)),
      type: BuildType.Managed,
      packageJson: 'packageJson',
      manifest: 'manifest',
    };
  }

  private shouldLoadCredentials(): boolean {
    return !!(
      (this.buildProfile.workflow === Workflow.Managed &&
        this.buildProfile.buildType === 'archive') ||
      this.buildProfile.workflow === Workflow.Generic
    );
  }
}

export { iOSBuilder };
