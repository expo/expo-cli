import { BuildType, Job, Platform, iOS, sanitizeJob } from '@expo/build-tools';
import { IOSConfig } from '@expo/config';
import once from 'lodash/once';
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
import prompts from '../../../../prompts';
import { ensureCredentialsAsync } from '../credentials';
import { Builder, BuilderContext } from '../types';
import * as gitUtils from '../utils/git';

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
    const bundleIdentifier = await getBundleIdentifier(this.ctx);

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
        log('Please review the following changes and pass the message to make the commit.');
        log.newLine();
        await gitUtils.showDiff();
        log.newLine();
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: 'Can we commit these changes for you?',
        });
        if (confirm) {
          await gitUtils.commitChangesAsync();
          log.newLine();
          log('✅ Successfully commited the configuration changes.');
        } else {
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
    };
  }

  private async prepareManagedJobAsync(
    archiveUrl: string,
    buildProfile: iOSManagedBuildProfile
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
const getBundleIdentifier = once(_getBundleIdentifier);

async function _getBundleIdentifier(ctx: BuilderContext): Promise<string> {
  const bundleIdentifierFromPbxproj = IOSConfig.BundleIdenitifer.getBundleIdentifierFromPbxproj(
    ctx.projectDir
  );
  const bundleIdentifierFromConfig = IOSConfig.BundleIdenitifer.getBundleIdentifier(ctx.exp);
  if (bundleIdentifierFromPbxproj !== null && bundleIdentifierFromConfig !== null) {
    if (bundleIdentifierFromPbxproj === bundleIdentifierFromConfig) {
      return bundleIdentifierFromPbxproj;
    } else {
      log.newLine();
      log(
        log.chalk.yellow(
          `We detected that your Xcode project is configured with a different bundle identifier than the one defined in app.json/app.config.js.
If you choose the one defined in app.json/app.config.js we'll automatically configure your Xcode project with it.
However, if you choose the one defined in the Xcode project you'll have to update app.json/app.config.js on your own.
Otherwise, you'll see this prompt again in the future.`
        )
      );
      log.newLine();
      const { bundleIdentifier } = await prompts({
        type: 'select',
        name: 'bundleIdentifier',
        message: 'Which bundle identifier should we use?',
        choices: [
          {
            title: `Defined in the Xcode project: ${log.chalk.bold(bundleIdentifierFromPbxproj)}`,
            value: bundleIdentifierFromPbxproj,
          },
          {
            title: `Defined in app.json/app.config.js: ${log.chalk.bold(
              bundleIdentifierFromConfig
            )}`,
            value: bundleIdentifierFromConfig,
          },
        ],
      });
      return bundleIdentifier;
    }
  } else if (bundleIdentifierFromPbxproj === null && bundleIdentifierFromConfig === null) {
    throw new Error('Please define "expo.ios.bundleIdentifier" in app.json/app.config.js');
  } else {
    if (bundleIdentifierFromPbxproj !== null) {
      log(
        `Using ${log.chalk.bold(
          bundleIdentifierFromPbxproj
        )} as the bundle identifier (read from the Xcode project).`
      );
      return bundleIdentifierFromPbxproj;
    } else {
      // bundleIdentifierFromConfig is never null in this case
      // the following line is to satisfy TS
      const bundleIdentifier = bundleIdentifierFromConfig ?? '';
      log(
        `Using ${log.chalk.bold(
          bundleIdentifier
        )} as the bundle identifier (read from app.json/app.config.js).
We'll automatically configure your Xcode project using this value.`
      );
      return bundleIdentifier;
    }
  }
}

export default iOSBuilder;
