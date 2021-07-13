import { Result, result } from '@expo/results';
import { UserManager } from 'xdl';

import Log from '../../../../log';
import { isUUID } from '../../../utils/isUUID';
import {
  ArchiveFileSource,
  ArchiveFileSourceType,
  ArchiveSource,
  ArchiveTypeSource,
  ArchiveTypeSourceType,
} from '../archive-source';
import { getExpoConfig } from '../utils/config';
import { AndroidPackageSource, AndroidPackageSourceType } from './AndroidPackageSource';
import { ArchiveType, ReleaseStatus, ReleaseTrack } from './AndroidSubmissionConfig';
import AndroidSubmitter, { AndroidSubmissionOptions } from './AndroidSubmitter';
import { ServiceAccountSource, ServiceAccountSourceType } from './ServiceAccountSource';
import { AndroidSubmissionContext, AndroidSubmitCommandOptions } from './types';

class AndroidSubmitCommand {
  static createContext(
    projectDir: string,
    commandOptions: AndroidSubmitCommandOptions
  ): AndroidSubmissionContext {
    return {
      projectDir,
      commandOptions,
    };
  }

  constructor(private ctx: AndroidSubmissionContext) {}

  async runAsync(): Promise<void> {
    if (!(await UserManager.getCurrentUserAsync())) {
      await UserManager.ensureLoggedInAsync();
      Log.addNewLineIfNone();
    }

    const submissionOptions = this.getAndroidSubmissionOptions();
    const submitter = new AndroidSubmitter(this.ctx, submissionOptions);
    await submitter.submitAsync();
  }

  private getAndroidSubmissionOptions(): AndroidSubmissionOptions {
    const androidPackageSource = this.resolveAndroidPackageSource();
    const track = this.resolveTrack();
    const releaseStatus = this.resolveReleaseStatus();
    const archiveSource = this.resolveArchiveSource();
    const serviceAccountSource = this.resolveServiceAccountSource();

    const errored = [
      androidPackageSource,
      track,
      releaseStatus,
      archiveSource,
      serviceAccountSource,
    ].filter(r => !r.ok);
    if (errored.length > 0) {
      const message = errored.map(err => err.reason?.message).join('\n');
      Log.error(message);
      throw new Error('Failed to submit the app');
    }

    return {
      androidPackageSource: androidPackageSource.enforceValue(),
      track: track.enforceValue(),
      releaseStatus: releaseStatus.enforceValue(),
      archiveSource: archiveSource.enforceValue(),
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
    return result({
      archiveFile: this.resolveArchiveFileSource(),
      archiveType: this.resolveArchiveTypeSource(),
    });
  }

  private resolveArchiveFileSource(): ArchiveFileSource {
    const { url, path, id, latest } = this.ctx.commandOptions;
    const chosenOptions = [url, path, id, latest];
    if (chosenOptions.filter(opt => opt).length > 1) {
      throw new Error(`Pass only one of: --url, --path, --id, --latest`);
    }

    if (url) {
      return {
        sourceType: ArchiveFileSourceType.url,
        url,
        platform: 'android',
        projectDir: this.ctx.projectDir,
      };
    } else if (path) {
      return {
        sourceType: ArchiveFileSourceType.path,
        path,
        platform: 'android',
        projectDir: this.ctx.projectDir,
      };
    } else if (id) {
      if (!isUUID(id)) {
        throw new Error(`${id} is not a id`);
      }
      return {
        sourceType: ArchiveFileSourceType.buildId,
        id,
        platform: 'android',
        projectDir: this.ctx.projectDir,
      };
    } else if (latest) {
      return {
        sourceType: ArchiveFileSourceType.latest,
        platform: 'android',
        projectDir: this.ctx.projectDir,
      };
    } else {
      return {
        sourceType: ArchiveFileSourceType.prompt,
        platform: 'android',
        projectDir: this.ctx.projectDir,
      };
    }
  }

  private resolveArchiveTypeSource(): ArchiveTypeSource {
    const { type: rawArchiveType } = this.ctx.commandOptions;
    if (rawArchiveType) {
      if (!(rawArchiveType in ArchiveType)) {
        throw new Error(
          `Unsupported archive type: ${rawArchiveType} (valid options: ${Object.keys(
            ArchiveType
          ).join(', ')})`
        );
      }
      const archiveType = rawArchiveType as ArchiveType;
      return {
        sourceType: ArchiveTypeSourceType.parameter,
        archiveType,
      };
    } else {
      return {
        sourceType: ArchiveTypeSourceType.infer,
      };
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
