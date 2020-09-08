import { BuildType, Job, Platform, iOS, sanitizeJob } from '@expo/build-tools';
import { IOSConfig } from '@expo/config';
import chalk from 'chalk';
import figures from 'figures';
import sortBy from 'lodash/sortBy';
import ora from 'ora';
import path from 'path';

import iOSCredentialsProvider, {
  iOSCredentials,
} from '../../../../credentials/provider/iOSCredentialsProvider';
import * as ProvisioningProfileUtils from '../../../../credentials/utils/provisioningProfile';
import {
  CredentialsSource,
  Workflow,
  iOSGenericBuildProfile,
  iOSManagedBuildProfile,
} from '../../../../easJson';
import { gitRootDirectory } from '../../../../git';
import log from '../../../../log';
import prompts from '../../../../prompts';
import { Builder, BuilderContext } from '../../types';
import * as gitUtils from '../../utils/git';
import { ensureCredentialsAsync } from '../credentials';
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

class iOSBuilder implements Builder<Platform.iOS> {
  private credentials?: iOSCredentials;
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
    await this.configureProjectAsync();
  }

  public async configureProjectAsync(): Promise<void> {
    if (this.ctx.buildProfile.workflow !== Workflow.Generic) {
      return;
    }

    // TODO: add simulator flow
    // assuming we're building for app store
    if (!this.credentials) {
      throw new Error('Call ensureCredentialsAsync first!');
    }

    const spinner = ora('Configuring the Xcode project');

    const bundleIdentifier = await getBundleIdentifier(
      this.ctx.commandCtx.projectDir,
      this.ctx.commandCtx.exp
    );

    const profileName = ProvisioningProfileUtils.readProfileName(
      this.credentials.provisioningProfile
    );
    const appleTeam = ProvisioningProfileUtils.readAppleTeam(this.credentials.provisioningProfile);

    const { projectDir } = this.ctx.commandCtx;
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
        spinner.succeed('We configured the Xcode project to build it on the Expo servers');
        log.newLine();

        try {
          await gitUtils.reviewAndCommitChangesAsync('Configure Xcode project', {
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
    const projectRootDirectory = path.relative(await gitRootDirectory(), process.cwd()) || '.';
    return {
      ...(await this.prepareJobCommonAsync(archiveUrl)),
      type: BuildType.Generic,
      scheme: this.scheme,
      artifactPath: buildProfile.artifactPath,
      projectRootDirectory,
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
