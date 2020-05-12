import { Result, result } from '@expo/results';

import AndroidSubmitter, { AndroidSubmissionOptions } from './AndroidSubmitter';
import { ArchiveType, ReleaseStatus, ReleaseTrack } from './AndroidSubmissionConfig';
import { ServiceAccountSource, ServiceAccountSourceType } from './ServiceAccountSource';
import { AndroidPackageSource, AndroidPackageSourceType } from './AndroidPackageSource';
import { AndroidSubmissionContext, AndroidSubmitCommandOptions } from './types';

import { ArchiveSource, ArchiveSourceType } from '../ArchiveSource';
import { SubmissionMode } from '../types';
import { getAppConfig, getExpoConfig } from '../utils/config';
import log from '../../../../log';

class AndroidSubmitCommand {
  static createContext(
    mode: SubmissionMode,
    projectDir: string,
    commandOptions: AndroidSubmitCommandOptions
  ): AndroidSubmissionContext {
    return {
      mode,
      projectDir,
      commandOptions,
    };
  }

  constructor(private ctx: AndroidSubmissionContext) {}

  async runAsync(): Promise<void> {
    const submissionOptions = this.getAndroidSubmissionOptions();
    const submitter = new AndroidSubmitter(this.ctx, submissionOptions);
    await submitter.submitAsync();
  }

  private getAndroidSubmissionOptions(): AndroidSubmissionOptions {
    const androidPackageSource = this.resolveAndroidPackageSource();
    const track = this.resolveTrack();
    const releaseStatus = this.resolveReleaseStatus();
    const archiveSource = this.resolveArchiveSource();
    const archiveType = this.resolveArchiveType();
    const serviceAccountSource = this.resolveServiceAccountSource();

    const errored = [
      androidPackageSource,
      track,
      releaseStatus,
      archiveSource,
      archiveType,
      serviceAccountSource,
    ].filter((r) => !r.ok);
    if (errored.length > 0) {
      const message = errored.map((err) => err.reason?.message).join('\n');
      log.error(message);
      throw new Error('Failed to submit the app');
    }

    return {
      androidPackageSource: androidPackageSource.enforceValue(),
      track: track.enforceValue(),
      releaseStatus: releaseStatus.enforceValue(),
      archiveSource: archiveSource.enforceValue(),
      archiveType: archiveType.enforceValue(),
      serviceAccountSource: serviceAccountSource.enforceValue(),
    };
  }

  private resolveAndroidPackageSource(): Result<AndroidPackageSource> {
    let androidPackage: string | undefined;
    if (this.ctx.commandOptions.androidPackage) {
      androidPackage = this.ctx.commandOptions.androidPackage;
    }
    const exp = getExpoConfig(this.ctx.projectDir);
    if (exp.android?.package) {
      androidPackage = exp.android.package;
    }
    if (androidPackage) {
      return result({
        sourceType: AndroidPackageSourceType.userDefined,
        androidPackage,
      });
    } else {
      return result({
        sourceType: AndroidPackageSourceType.prompt,
      });
    }
  }

  private resolveTrack(): Result<ReleaseTrack> {
    const { track } = this.ctx.commandOptions;
    if (!track) {
      return result(ReleaseTrack.production);
    }
    if (track in ReleaseTrack) {
      return result(ReleaseTrack[track as keyof typeof ReleaseTrack]);
    } else {
      return result(
        new Error(
          `Unsupported track: ${track} (valid options: ${Object.keys(ReleaseTrack).join(', ')})`
        )
      );
    }
  }

  private resolveReleaseStatus(): Result<ReleaseStatus> {
    const { releaseStatus } = this.ctx.commandOptions;
    if (!releaseStatus) {
      return result(ReleaseStatus.completed);
    }
    if (releaseStatus in ReleaseStatus) {
      return result(ReleaseStatus[releaseStatus as keyof typeof ReleaseStatus]);
    } else {
      return result(
        new Error(
          `Unsupported release status: ${releaseStatus} (valid options: ${Object.keys(
            ReleaseStatus
          ).join(', ')})`
        )
      );
    }
  }

  private resolveArchiveSource(): Result<ArchiveSource> {
    const chosenOptions = [
      this.ctx.commandOptions.url,
      this.ctx.commandOptions.path,
      this.ctx.commandOptions.id,
      this.ctx.commandOptions.latest,
    ];
    if (chosenOptions.filter((opt) => opt).length > 1) {
      throw new Error(`Pass only one of: --url, --path, --id, --latest`);
    }
    if (this.ctx.commandOptions.url) {
      return result({
        sourceType: ArchiveSourceType.url,
        url: this.ctx.commandOptions.url,
      });
    } else if (this.ctx.commandOptions.path) {
      return result({
        sourceType: ArchiveSourceType.path,
        path: this.ctx.commandOptions.path,
      });
    } else if (this.ctx.commandOptions.id) {
      // legacy for Turtle v1
      const { owner, slug } = getAppConfig(this.ctx.projectDir);
      return result({
        sourceType: ArchiveSourceType.buildId,
        platform: 'android',
        id: this.ctx.commandOptions.id,
        owner,
        slug,
      });
    } else if (this.ctx.commandOptions.latest) {
      // legacy for Turtle v1
      const { owner, slug } = getAppConfig(this.ctx.projectDir);
      return result({
        sourceType: ArchiveSourceType.latest,
        platform: 'android',
        owner,
        slug,
      });
    } else {
      return result({
        sourceType: ArchiveSourceType.prompt,
        platform: 'android',
        projectDir: this.ctx.projectDir,
      });
    }
  }

  private resolveArchiveType(): Result<ArchiveType> {
    const { archiveType } = this.ctx.commandOptions;
    if (!archiveType) {
      return result(ArchiveType.apk);
    }
    if (archiveType in ArchiveType) {
      return result(ArchiveType[archiveType as keyof typeof ArchiveType]);
    } else {
      return result(
        new Error(
          `Unsupported archive type: ${archiveType} (valid options: ${Object.keys(ArchiveType).join(
            ', '
          )})`
        )
      );
    }
  }

  private resolveServiceAccountSource(): Result<ServiceAccountSource> {
    const { key } = this.ctx.commandOptions;
    if (key) {
      return result({
        sourceType: ServiceAccountSourceType.path,
        path: key,
      });
    } else {
      return result({
        sourceType: ServiceAccountSourceType.prompt,
      });
    }
  }
}

export default AndroidSubmitCommand;
