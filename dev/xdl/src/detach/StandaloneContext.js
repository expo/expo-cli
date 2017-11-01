/**
 * @flow
 */

type StandaloneContextDataType = 'user' | 'service';
type StandaloneContextBuildConfiguration = 'Debug' | 'Release';
type StandaloneContextDataUser = {
  projectPath: string,
  exp: any,
};
type StandaloneContextDataService = {
  expoSourcePath: string,
  archivePath: string,
  manifest: any,
  privateConfig: any,
};

class StandaloneContext {
  type: StandaloneContextDataType;
  data: StandaloneContextDataUser | StandaloneContextDataService;
  config: any; // same as underlying exp or manifest
  published: {
    url: ?string,
    releaseChannel: string,
  }
  build: {
    configuration: StandaloneContextBuildConfiguration,
  }

  static createUserContext = (projectPath: string, exp: any, publishedUrl: ?string): StandaloneContext => {
    let context = new StandaloneContext();
    context.type = 'user';
    context.data = {
      projectPath,
      exp,
    };
    context.config = exp;
    context.published = {
      url: publishedUrl,
      releaseChannel: 'default',
    };
    // we never expect user contexts to be pre-built right now
    context.build = {
      configuration: 'Debug',
    };
    return context;
  };

  static createServiceContext = (
    expoSourcePath: string,
    archivePath: string,
    manifest: any,
    privateConfig: any,
    buildConfiguration: StandaloneContextBuildConfiguration,
    publishedUrl: ?string,
    releaseChannel: ?string,
  ): StandaloneContext => {
    let context = new StandaloneContext();
    context.type = 'service';
    context.data = {
      expoSourcePath,
      archivePath,
      manifest,
      privateConfig,
    };
    context.config = manifest;
    context.build = {
      configuration: buildConfiguration,
    };
    context.published = {
      url: publishedUrl,
      releaseChannel: (releaseChannel) ? releaseChannel : 'default',
    };
    return context;
  };
}

export default StandaloneContext;
