export interface AndroidSubmissionConfig {
  archiveUrl: string;
  archiveType: ArchiveType;
  androidPackage: string;
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
