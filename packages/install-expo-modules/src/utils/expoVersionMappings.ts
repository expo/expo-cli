interface VersionInfo {
  iosDeploymentTarget: string;
}

const DEFAULT_VERSION = '43.0.0';

export const ExpoVersionMappings: Record<string, VersionInfo> = {
  '43.0.0': {
    iosDeploymentTarget: '12.0',
  },
};

export function getDefaultVersion(): string {
  return DEFAULT_VERSION;
}

export function isSupportedVersion(version: string): boolean {
  return !!ExpoVersionMappings[version];
}

export function getIosDeploymentTarget(version: string): string {
  return ExpoVersionMappings[version]?.iosDeploymentTarget;
}
