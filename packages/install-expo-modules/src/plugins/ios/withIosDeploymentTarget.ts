import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';
import semver from 'semver';
import { ISA, XCBuildConfiguration } from 'xcparse';

import { withXCParseXcodeProject, XCParseXcodeProject } from './withXCParseXcodeProject';

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

// Because regexp //g is stateful, to use it multiple times, we should create a new one.
function createPodfilePlatformRegExp() {
  return /^(\s*platform :ios, ['"])([\d.]+)(['"])/gm;
}

export function updateDeploymentTargetPodfile(contents: string, deploymentTarget: string): string {
  return contents.replace(createPodfilePlatformRegExp(), (match, prefix, version, suffix) => {
    if (semver.lt(toSemVer(version), toSemVer(deploymentTarget))) {
      return `${prefix}${deploymentTarget}${suffix}`;
    }
    return match;
  });
}

export async function shouldUpdateDeployTargetPodfileAsync(
  projectRoot: string,
  targetVersion: string
) {
  const podfilePath = path.join(projectRoot, 'ios', 'Podfile');
  const podfile = await fs.promises.readFile(podfilePath, 'utf-8');
  const matchResult = createPodfilePlatformRegExp().exec(podfile);
  if (!matchResult) {
    console.warn(
      'Unrecognized `ios/Podfile` content, will skip the process to update minimum iOS supported version.'
    );
    return false;
  }
  const [, , version] = matchResult;
  return semver.lt(toSemVer(version), toSemVer(targetVersion));
}

const withIosDeploymentTargetXcodeProject: IosDeploymentTargetConfigPlugin = (config, props) => {
  return withXCParseXcodeProject(config, config => {
    config.modResults = updateDeploymentTargetXcodeProject(
      config.modResults,
      props.deploymentTarget
    );
    return config;
  });
};

export function updateDeploymentTargetXcodeProject(
  project: XCParseXcodeProject,
  deploymentTarget: string
): XCParseXcodeProject {
  for (const section of Object.values(project.objects ?? {})) {
    if (section.isa === ISA.XCBuildConfiguration) {
      const { buildSettings } = section as XCBuildConfiguration;
      const currDeploymentTarget = buildSettings?.IPHONEOS_DEPLOYMENT_TARGET;
      if (
        currDeploymentTarget &&
        semver.lt(toSemVer(currDeploymentTarget), toSemVer(deploymentTarget))
      ) {
        buildSettings.IPHONEOS_DEPLOYMENT_TARGET = deploymentTarget;
      }
    }
  }
  return project;
}

function toSemVer(version: string): semver.SemVer {
  return semver.coerce(version) ?? new semver.SemVer('0.0.0');
}
