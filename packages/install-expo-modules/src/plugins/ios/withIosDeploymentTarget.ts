import {
  ConfigPlugin,
  withDangerousMod,
  withXcodeProject,
  XcodeProject,
} from '@expo/config-plugins';
import fs from 'fs-extra';
import path from 'path';

export const EXPO_MODULES_MIN_DEPLOYMENT_TARGET = 12;

export const withIosDeploymentTarget: ConfigPlugin = config => {
  config = withIosDeploymentTargetPodfile(config);
  config = withIosDeploymentTargetXcodeProject(config);
  return config;
};

const withIosDeploymentTargetPodfile: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = await fs.readFile(podfile, 'utf8');
      contents = updateDeploymentTargetPodfile(contents);

      await fs.writeFile(podfile, contents);
      return config;
    },
  ]);
};

export function updateDeploymentTargetPodfile(contents: string): string {
  return contents.replace(
    /^(\s*platform :ios, ['"])(\d+)\.(\d+)(['"])/gm,
    (match, prefix, majorVersion, minorVersion, suffix) => {
      if (Number(majorVersion) < EXPO_MODULES_MIN_DEPLOYMENT_TARGET) {
        return `${prefix}12.0${suffix}`;
      }
      return match;
    }
  );
}

const withIosDeploymentTargetXcodeProject: ConfigPlugin = config => {
  return withXcodeProject(config, config => {
    config.modResults = updateDeploymentTargetXcodeProject(config.modResults);
    return config;
  });
};

export function updateDeploymentTargetXcodeProject(project: XcodeProject): XcodeProject {
  const configurations = project.pbxXCBuildConfigurationSection();
  for (const { buildSettings } of Object.values(configurations ?? {})) {
    const deploymentTarget = buildSettings?.IPHONEOS_DEPLOYMENT_TARGET;
    if (
      deploymentTarget &&
      Number(deploymentTarget.split('.')[0]) < EXPO_MODULES_MIN_DEPLOYMENT_TARGET
    ) {
      buildSettings.IPHONEOS_DEPLOYMENT_TARGET = `${EXPO_MODULES_MIN_DEPLOYMENT_TARGET}.0`;
    }
  }
  return project;
}
