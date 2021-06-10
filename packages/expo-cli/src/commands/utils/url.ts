import dns from 'dns';

export function getExpoDomainUrl(): string {
  if (process.env.EXPO_STAGING) {
    return `https://staging.expo.io`;
  } else if (process.env.EXPO_LOCAL) {
    return `http://expo.test`;
  } else {
    return `https://expo.io`;
  }
}

export function constructBuildLogsUrl({
  buildId,
  username,
  projectSlug,
}: {
  buildId: string;
  username?: string;
  projectSlug?: string;
  v2?: boolean;
}): string {
  if (username && projectSlug) {
    return `${getExpoDomainUrl()}/accounts/${username}/projects/${projectSlug}/builds/${buildId}`;
  } else if (username) {
    return `${getExpoDomainUrl()}/accounts/${username}/builds/${buildId}`;
  } else {
    return `${getExpoDomainUrl()}/builds/${buildId}`;
  }
}

export function constructTurtleStatusUrl(): string {
  return `${getExpoDomainUrl()}/turtle-status`;
}

export function constructArtifactUrl(artifactId: string): string {
  return `${getExpoDomainUrl()}/artifacts/${artifactId}`;
}

export function isUrlAvailableAsync(url: string): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    dns.lookup(url, err => {
      resolve(!err);
    });
  });
}
