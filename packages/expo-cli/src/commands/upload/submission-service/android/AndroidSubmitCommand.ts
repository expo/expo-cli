import { Result, result } from '@expo/results';

import AndroidSubmitter, { AndroidSubmissionOptions } from './AndroidSubmitter';
import { ArchiveSource, ArchiveSourceType } from '../ArchiveSource';
import { ArchiveType, ReleaseStatus, ReleaseTrack } from './AndroidSubmissionConfig';
import { ServiceAccountSource, ServiceAccountSourceType } from './ServiceAccountSource';
import { AndroidPackageSource, AndroidPackageSourceType } from './AndroidPackageSource';
import { SubmissionContext, SubmitCommandOptions } from '../types';
import { getAppConfig, getExpoConfig } from '../utils/config';
import log from '../../../../log';

export interface AndroidSubmitCommandOptions extends SubmitCommandOptions {
  archiveType?: string;
  key?: string;
  androidPackage?: string;
  track?: string;
  releaseStatus?: string;
}

type AndroidSubmissionContext = SubmissionContext<AndroidSubmitCommandOptions>;

class AndroidSubmitCommand {
  static createContext(projectDir: string, options: AndroidSubmitCommandOptions) {
    return {
      projectDir,
      options,
    };
  }

  constructor(private ctx: AndroidSubmissionContext) {}

  async run(): Promise<void> {
    const submissionOptions = this.getAndroidSubmissionOptions();
    const submitter = new AndroidSubmitter(submissionOptions, this.ctx.options.verbose ?? false);
    await submitter.submit();
  }

  private getAndroidSubmissionOptions(): AndroidSubmissionOptions {
    const androidPackage = this.resolveAndroidPackage();
    const track = this.resolveTrack();
    const releaseStatus = this.resolveReleaseStatus();
    const archiveSource = this.resolveArchiveSource();
    const archiveType = this.resolveArchiveType();
    const serviceAccountSource = this.resolveServiceAccountSource();

    const errored = [
      androidPackage,
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
      androidPackage: androidPackage.enforceValue(),
      track: track.enforceValue(),
      releaseStatus: releaseStatus.enforceValue(),
      archiveSource: archiveSource.enforceValue(),
      archiveType: archiveType.enforceValue(),
      serviceAccountSource: serviceAccountSource.enforceValue(),
    };
  }

  private resolveAndroidPackage(): Result<AndroidPackageSource> {
    let androidPackage: string | undefined;
    if (this.ctx.options.androidPackage) {
      androidPackage = this.ctx.options.androidPackage;
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
    const { track } = this.ctx.options;
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
    const { releaseStatus } = this.ctx.options;
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
      this.ctx.options.url,
      this.ctx.options.path,
      this.ctx.options.id,
      this.ctx.options.latest,
    ];
    if (chosenOptions.filter((opt) => opt).length > 1) {
      throw new Error(`Pass only one of: --url, --path, --id, --latest`);
    }
    if (this.ctx.options.url) {
      return result({
        sourceType: ArchiveSourceType.url,
        url: this.ctx.options.url,
      });
    } else if (this.ctx.options.path) {
      return result({
        sourceType: ArchiveSourceType.path,
        path: this.ctx.options.path,
      });
    } else if (this.ctx.options.id) {
      // legacy for Turtle v1
      const { owner, slug } = getAppConfig(this.ctx.projectDir);
      return result({
        sourceType: ArchiveSourceType.buildId,
        platform: 'android',
        id: this.ctx.options.id,
        owner,
        slug,
      });
    } else if (this.ctx.options.latest) {
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
    const { archiveType } = this.ctx.options;
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
    const { key } = this.ctx.options;
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
