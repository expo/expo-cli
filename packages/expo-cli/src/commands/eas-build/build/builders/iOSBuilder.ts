import { BuildType, Job, Platform, iOS, sanitizeJob } from '@expo/build-tools';
import { IOSConfig } from '@expo/config';
import chalk from 'chalk';
import figures from 'figures';
import ora from 'ora';

import iOSCredentialsProvider, {
  iOSCredentials,
} from '../../../../credentials/provider/iOSCredentialsProvider';
import * as ProvisioningProfileUtils from '../../../../credentials/utils/provisioningProfile';
import {
  Workflow,
  iOSBuildProfile,
  iOSGenericBuildProfile,
  iOSManagedBuildProfile,
} from '../../../../easJson';
import log from '../../../../log';
import { ensureCredentialsAsync } from '../credentials';
import { Builder, BuilderContext } from '../types';
import * as gitUtils from '../utils/git';
import { getBundleIdentifier } from '../utils/ios';

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
      return sanitizeJob(await this.prepareGenericJobAsync(archiveUrl, this.buildProfile));
    } else if (this.buildProfile.workflow === Workflow.Managed) {
      return sanitizeJob(await this.prepareManagedJobAsync(archiveUrl, this.buildProfile));
    } else {
      throw new Error("Unknown workflow. Shouldn't happen");
    }
  }

  public async ensureCredentialsAsync(): Promise<void> {
    if (!this.shouldLoadCredentials()) {
      return;
    }
    const bundleIdentifier = await getBundleIdentifier(this.ctx.projectDir, this.ctx.exp);
    const provider = new iOSCredentialsProvider(this.ctx.projectDir, {
      projectName: this.ctx.projectName,
      accountName: this.ctx.accountName,
      bundleIdentifier,
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
    // TODO: add simulator flow
    // assuming we're building for app store
    if (!this.credentials) {
      throw new Error('Call ensureCredentialsAsync first!');
    }
    const bundleIdentifier = await getBundleIdentifier(this.ctx.projectDir, this.ctx.exp);

    const spinner = ora('Making sure your iOS project is set up properly');

    const profileName = ProvisioningProfileUtils.readProfileName(
      this.credentials.provisioningProfile
    );
    const appleTeam = ProvisioningProfileUtils.readAppleTeam(this.credentials.provisioningProfile);

    const { projectDir } = this.ctx;
    IOSConfig.BundleIdenitifer.setBundleIdentifierForPbxproj(projectDir, bundleIdentifier, false);
    IOSConfig.ProvisioningProfile.setProvisioningProfileForPbxproj(projectDir, {
      profileName,
      appleTeamId: appleTeam.teamId,
    });

    try {
      await gitUtils.ensureGitStatusIsCleanAsync();
      spinner.succeed();
    } catch (err) {
      if (err instanceof gitUtils.DirtyGitTreeError) {
        spinner.succeed('We configured your iOS project to build it on the Expo servers');
        log.newLine();

        try {
          await gitUtils.reviewAndCommitChangesAsync('Configure Xcode project', {
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
      artifactPath: buildProfile.artifactPath,
    };
  }

  private async prepareManagedJobAsync(
    archiveUrl: string,
    _buildProfile: iOSManagedBuildProfile
  ): Promise<Partial<iOS.ManagedJob>> {
    return {
      ...(await this.prepareJobCommonAsync(archiveUrl)),
      type: BuildType.Managed,
      packageJson: { example: 'packageJson' },
      manifest: { example: 'manifest' },
    };
  }

  private shouldLoadCredentials(): boolean {
    return (
      (this.buildProfile.workflow === Workflow.Managed &&
        this.buildProfile.buildType !== 'simulator') ||
      this.buildProfile.workflow === Workflow.Generic
    );
  }
}

export default iOSBuilder;
