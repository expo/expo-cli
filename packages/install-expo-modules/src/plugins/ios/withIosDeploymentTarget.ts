import {
  ConfigPlugin,
  withDangerousMod,
  withXcodeProject,
  XcodeProject,
} from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';
import semver from 'semver';

type IosDeploymentTargetConfigPlugin = ConfigPlugin<{ deploymentTarget: string }>;

export const withIosDeploymentTarget: IosDeploymentTargetConfigPlugin = (config, props) => {
  config = withIosDeploymentTargetPodfile(config, props);
  config = withIosDeploymentTargetXcodeProject(config, props);
  return config;
};

const withIosDeploymentTargetPodfile: IosDeploymentTargetConfigPlugin = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = await fs.promises.readFile(podfile, 'utf8');
      contents = updateDeploymentTargetPodfile(contents, props.deploymentTarget);

      await fs.promises.writeFile(podfile, contents);
      return config;
    },
  ]);
};

export function updateDeploymentTargetPodfile(contents: string, deploymentTarget: string): string {
  return contents.replace(
    /^(\s*platform :ios, ['"])([\d.]+)(['"])/gm,
    (match, prefix, version, suffix) => {
      if (semver.lt(toSemVer(version), toSemVer(deploymentTarget))) {
        return `${prefix}${deploymentTarget}${suffix}`;
      }
      return match;
    }
  );
}

const withIosDeploymentTargetXcodeProject: IosDeploymentTargetConfigPlugin = (config, props) => {
  return withXcodeProject(config, config => {
    config.modResults = updateDeploymentTargetXcodeProject(
      config.modResults,
      props.deploymentTarget
    );
    return config;
  });
};

export function updateDeploymentTargetXcodeProject(
  project: XcodeProject,
  deploymentTarget: string
): XcodeProject {
  const configurations = project.pbxXCBuildConfigurationSection();
  for (const { buildSettings } of Object.values(configurations ?? {})) {
    const currDeploymentTarget = buildSettings?.IPHONEOS_DEPLOYMENT_TARGET;
    if (
      currDeploymentTarget &&
      semver.lt(toSemVer(currDeploymentTarget), toSemVer(deploymentTarget))
    ) {
      buildSettings.IPHONEOS_DEPLOYMENT_TARGET = deploymentTarget;
    }
  }
  return project;
}

function toSemVer(version: string): semver.SemVer {
  return semver.coerce(version) ?? new semver.SemVer('0.0.0');
}
