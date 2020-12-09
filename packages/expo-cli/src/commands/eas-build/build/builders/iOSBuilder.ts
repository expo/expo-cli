import { IOSConfig } from '@expo/config-plugins';
import { iOS, Job, Platform, sanitizeJob, Workflow } from '@expo/eas-build-job';
import sortBy from 'lodash/sortBy';
import path from 'path';

import { readSecretEnvsAsync } from '../../../../credentials/credentialsJson/read';
import iOSCredentialsProvider, {
  iOSCredentials,
} from '../../../../credentials/provider/iOSCredentialsProvider';
import * as ProvisioningProfileUtils from '../../../../credentials/utils/provisioningProfile';
import {
  CredentialsSource,
  iOSGenericBuildProfile,
  iOSManagedBuildProfile,
} from '../../../../easJson';
import { gitRootDirectory } from '../../../../git';
import log from '../../../../log';
import prompts from '../../../../prompts';
import { Builder, BuilderContext } from '../../types';
import { isExpoUpdatesInstalled } from '../../utils/expoUpdates/common';
import { configureUpdatesAsync, syncUpdatesConfigurationAsync } from '../../utils/expoUpdates/ios';
import { modifyAndCommitAsync } from '../../utils/git';
import { ensureCredentialsAsync } from '../credentials';
import { getBundleIdentifier } from '../utils/ios';

interface CommonJobProperties {
  platform: Platform.iOS;
  projectUrl: string;
  secrets: {
    buildCredentials?: {
      provisioningProfileBase64: string;
      distributionCertificate: {
        dataBase64: string;
        password: string;
      };
    };
    secretEnvs?: Record<string, string>;
  };
}

class iOSBuilder implements Builder<Platform.iOS> {
  private credentials?: iOSCredentials;
  private secretEnvs?: Record<string, string>;
  private scheme?: string;

  constructor(public readonly ctx: BuilderContext<Platform.iOS>) {}

  public async prepareJobAsync(archiveUrl: string): Promise<Job> {
    if (this.ctx.buildProfile.workflow === Workflow.Generic) {
      return sanitizeJob(await this.prepareGenericJobAsync(archiveUrl, this.ctx.buildProfile));
    } else if (this.ctx.buildProfile.workflow === Workflow.Managed) {
      return sanitizeJob(await this.prepareManagedJobAsync(archiveUrl, this.ctx.buildProfile));
    } else {
      throw new Error("Unknown workflow. Shouldn't happen");
    }
  }

  public async ensureCredentialsAsync(): Promise<
    CredentialsSource.LOCAL | CredentialsSource.REMOTE | undefined
  > {
    this.secretEnvs = await readSecretEnvsAsync(this.ctx.commandCtx.projectDir);

    if (!this.shouldLoadCredentials()) {
      return;
    }
    const bundleIdentifier = await getBundleIdentifier(
      this.ctx.commandCtx.projectDir,
      this.ctx.commandCtx.exp
    );
    const provider = new iOSCredentialsProvider(
      this.ctx.commandCtx.projectDir,
      {
        projectName: this.ctx.commandCtx.projectName,
        accountName: this.ctx.commandCtx.accountName,
        bundleIdentifier,
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

  public async setupAsync(): Promise<void> {
    if (this.ctx.buildProfile.workflow === Workflow.Generic) {
      this.scheme = this.ctx.buildProfile.scheme ?? (await this.resolveScheme());
    }
  }

  public async ensureProjectConfiguredAsync(): Promise<void> {
    const { projectDir, nonInteractive, exp } = this.ctx.commandCtx;

    await modifyAndCommitAsync(
      async () => {
        await this.configureEasBuildAsync();
        if (isExpoUpdatesInstalled(projectDir)) {
          await syncUpdatesConfigurationAsync(projectDir, exp);
        }
      },
      {
        startMessage: 'Making sure your Xcode project is set up properly',
        commitMessage: 'Configure Xcode project',
        commitSuccessMessage: 'Successfully committed the configuration changes',
        successMessage: 'We configured your Xcode project to build it on the Expo servers',
        nonInteractive,
      }
    );
  }

  public async configureProjectAsync(): Promise<void> {
    const { projectDir, nonInteractive, exp } = this.ctx.commandCtx;

    await modifyAndCommitAsync(
      async () => {
        await this.configureEasBuildAsync();
        if (isExpoUpdatesInstalled(projectDir)) {
          await configureUpdatesAsync(projectDir, exp);
        }
      },
      {
        startMessage: 'Configuring the Xcode project',
        commitMessage: 'Configure Xcode project',
        commitSuccessMessage: 'Successfully committed the configuration changes',
        successMessage: 'We configured your Xcode project to build it on the Expo servers',
        nonInteractive,
      }
    );
  }

  private async configureEasBuildAsync(): Promise<void> {
    if (this.ctx.buildProfile.workflow !== Workflow.Generic) {
      return;
    }

    // TODO: add simulator flow
    // assuming we're building for app store
    if (!this.credentials) {
      throw new Error('Call ensureCredentialsAsync first!');
    }

    const { projectDir, exp } = this.ctx.commandCtx;

    const bundleIdentifier = await getBundleIdentifier(projectDir, exp);

    const profileName = ProvisioningProfileUtils.readProfileName(
      this.credentials.provisioningProfile
    );
    const appleTeam = ProvisioningProfileUtils.readAppleTeam(this.credentials.provisioningProfile);

    IOSConfig.BundleIdenitifer.setBundleIdentifierForPbxproj(projectDir, bundleIdentifier, false);
    IOSConfig.ProvisioningProfile.setProvisioningProfileForPbxproj(projectDir, {
      profileName,
      appleTeamId: appleTeam.teamId,
    });
  }

  private async prepareJobCommonAsync(archiveUrl: string): Promise<Partial<CommonJobProperties>> {
    const buildCredentials = this.credentials
      ? {
          buildCredentials: {
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
      secrets: {
        ...(this.secretEnvs ? { secretEnvs: this.secretEnvs } : {}),
        ...buildCredentials,
      },
    };
  }

  private async prepareGenericJobAsync(
    archiveUrl: string,
    buildProfile: iOSGenericBuildProfile
  ): Promise<Partial<iOS.GenericJob>> {
    const projectRootDirectory = path.relative(await gitRootDirectory(), process.cwd()) || '.';
    return {
      ...(await this.prepareJobCommonAsync(archiveUrl)),
      type: Workflow.Generic,
      scheme: this.scheme,
      artifactPath: buildProfile.artifactPath,
      releaseChannel: buildProfile.releaseChannel,
      projectRootDirectory,
    };
  }

  private async prepareManagedJobAsync(
    archiveUrl: string,
    _buildProfile: iOSManagedBuildProfile
  ): Promise<Partial<iOS.ManagedJob>> {
    const projectRootDirectory = path.relative(await gitRootDirectory(), process.cwd()) || '.';
    return {
      ...(await this.prepareJobCommonAsync(archiveUrl)),
      type: Workflow.Managed,
      projectRootDirectory,
    };
  }

  private shouldLoadCredentials(): boolean {
    return (
      (this.ctx.buildProfile.workflow === Workflow.Managed &&
        this.ctx.buildProfile.buildType !== 'simulator') ||
      this.ctx.buildProfile.workflow === Workflow.Generic
    );
  }

  private async resolveScheme(): Promise<string> {
    const schemes = IOSConfig.Scheme.getSchemesFromXcodeproj(this.ctx.commandCtx.projectDir);
    if (schemes.length === 1) {
      return schemes[0];
    }

    const sortedSchemes = sortBy(schemes);
    log.newLine();
    log(
      `We've found multiple schemes in your Xcode project: ${log.chalk.bold(
        sortedSchemes.join(', ')
      )}`
    );
    log(
      `You can specify the scheme you want to build at ${log.chalk.bold(
        'builds.ios.PROFILE_NAME.scheme'
      )} in eas.json.`
    );
    if (this.ctx.commandCtx.nonInteractive) {
      const withoutTvOS = sortedSchemes.filter(i => !i.includes('tvOS'));
      const scheme = withoutTvOS.length > 0 ? withoutTvOS[0] : sortedSchemes[0];
      log(
        `You've run Expo CLI in non-interactive mode, choosing the ${log.chalk.bold(
          scheme
        )} scheme.`
      );
      log.newLine();
      return scheme;
    } else {
      const { selectedScheme } = await prompts({
        type: 'select',
        name: 'selectedScheme',
        message: 'Which scheme would you like to build now?',
        choices: sortedSchemes.map(scheme => ({ title: scheme, value: scheme })),
      });
      log.newLine();
      return selectedScheme as string;
    }
  }
}

export default iOSBuilder;
