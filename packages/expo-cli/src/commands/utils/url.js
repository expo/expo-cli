export function getExpoDomainUrl() {
  if (process.env.EXPO_STAGING) {
    return `https://staging.expo.io`;
  } else if (process.env.EXPO_LOCAL) {
    return `http://expo.test`;
  } else {
    return `https://expo.io`;
  }
}

export function constructBuildLogsUrl(buildId) {
  return `${getExpoDomainUrl()}/builds/${buildId}`;
}

export function constructTurtleStatusUrl(): string {
  return `${getExpoDomainUrl()}/turtle-status`;
}

export function constructArtifactUrl(artifactId: string): string {
  return `${getExpoDomainUrl()}/artifacts/${artifactId}`;
}
