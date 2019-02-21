import get from 'lodash/get';

/**
 *  @flow
 *
 *  StandaloneBuildFlags is owned by a StandaloneContext and carries information about
 *  how to compile native code during the build step.
 */

type StandaloneBuildConfiguration = 'Debug' | 'Release';
type StandaloneBuildAndroidFlags = {
  keystore: string,
  keystorePassword: string,
  keyAlias: string,
  keyPassword: string,
  outputFile: ?string,
};
type StandaloneBuildIosFlags = {
  workspaceSourcePath: string,
  appleTeamId: ?string,
};

class StandaloneBuildFlags {
  configuration: StandaloneBuildConfiguration;
  android: ?StandaloneBuildAndroidFlags;
  ios: ?StandaloneBuildIosFlags;

  static createEmpty = () => {
    let flags = new StandaloneBuildFlags();
    flags.configuration = 'Debug';
    flags.isExpoClientBuild = () => false;
    return flags;
  };

  static createIos = (
    configuration: StandaloneBuildConfiguration,
    ios: ?StandaloneBuildIosFlags
  ): StandaloneBuildFlags => {
    let flags = new StandaloneBuildFlags();
    flags.configuration = configuration;
    flags.ios = ios;
    flags.isExpoClientBuild = () => get(ios, 'buildType') === 'client';
    return flags;
  };

  static createAndroid = (
    configuration: StandaloneBuildConfiguration,
    android: ?StandaloneBuildAndroidFlags
  ): StandaloneBuildFlags => {
    let flags = new StandaloneBuildFlags();
    flags.configuration = configuration;
    flags.android = android;
    flags.isExpoClientBuild = () => false;
    return flags;
  };
}

export default StandaloneBuildFlags;
