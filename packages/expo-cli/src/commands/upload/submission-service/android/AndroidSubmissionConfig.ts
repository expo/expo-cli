export interface AndroidSubmissionConfig {
  archiveUrl: string;
  archiveType: ArchiveType;
  // This field is replaced by `androidApplicationId` in the public API
  // androidPackage?: string;
  applicationId: string;
  track: ReleaseTrack;
  serviceAccount: string;
  releaseStatus?: ReleaseStatus;
}

enum ArchiveType {
  apk = 'apk',
  aab = 'aab',
}

enum ReleaseStatus {
  completed = 'completed',
  draft = 'draft',
  halted = 'halted',
  inProgress = 'inProgress',
}

enum ReleaseTrack {
  production = 'production',
  beta = 'beta',
  alpha = 'alpha',
  internal = 'internal',
}

export { ArchiveType, ReleaseStatus, ReleaseTrack };
