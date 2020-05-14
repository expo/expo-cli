import { SubmissionMode } from '../types';
import { ArchiveType } from '../android/AndroidSubmissionConfig';
import {
  ArchiveFileSource,
  ArchiveFileSourceType,
  getArchiveFileLocationAsync,
} from './ArchiveFileSource';
import { ArchiveTypeSource, ArchiveTypeSourceType, getArchiveTypeAsync } from './ArchiveTypeSource';

export interface ArchiveSource {
  archiveFile: ArchiveFileSource;
  archiveType: ArchiveTypeSource;
}

export interface Archive {
  location: string;
  type: ArchiveType;
}

async function getArchiveAsync(mode: SubmissionMode, source: ArchiveSource): Promise<Archive> {
  const location = await getArchiveFileLocationAsync(mode, source.archiveFile);
  const type = await getArchiveTypeAsync(source.archiveType, location);
  return {
    location,
    type,
  };
}

export {
  ArchiveFileSource,
  ArchiveTypeSourceType,
  ArchiveTypeSource,
  ArchiveFileSourceType,
  getArchiveAsync,
};
