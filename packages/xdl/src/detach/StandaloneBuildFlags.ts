/*
 *  StandaloneBuildFlags is owned by a StandaloneContext and carries information about
 *  how to compile native code during the build step.
 */

type StandaloneBuildConfiguration = 'Debug' | 'Release';
type StandaloneBuildAndroidFlags = {
  keystore: string;
  keystorePassword: string;
  keyAlias: string;
  keyPassword: string;
  outputFile: string | null;
};
type StandaloneBuildIosFlags = {
  workspaceSourcePath: string;
  appleTeamId: string | null;
  buildType?: string;
  bundleExecutable?: string;
};

class StandaloneBuildFlags {
  configuration: StandaloneBuildConfiguration = 'Debug';
  isExpoClientBuild: () => boolean = () => false;
  android?: StandaloneBuildAndroidFlags;
  ios?: StandaloneBuildIosFlags;

  static createEmpty = () => {
    return new StandaloneBuildFlags();
  };
}

export default StandaloneBuildFlags;
