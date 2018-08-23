/**
 * @flow
 */

import StandaloneBuildFlags from './StandaloneBuildFlags';

type StandaloneContextDataType = 'user' | 'service';

type StandaloneContextTestEnvironment = 'none' | 'local' | 'ci';

/**
 *  A user context is used when we are configuring a standalone app locally on a user's machine,
 *  such as during `exp detach`.
 */
type StandaloneContextDataUser = {
  projectPath: string,
  exp: any,
};

/**
 *  A service context is used when we are generating a standalone app remotely on an Expo
 *  service machine, such as during `exp build`.
 */
type StandaloneContextDataService = {
  expoSourcePath: string,
  archivePath: ?string,
  manifest: ?any,
  privateConfig: ?any,
  testEnvironment: StandaloneContextTestEnvironment,
};

class StandaloneContext {
  type: StandaloneContextDataType;
  data: StandaloneContextDataUser | StandaloneContextDataService;
  config: ?any; // same as underlying app.json or manifest
  published: {
    url: ?string,
    releaseChannel: string,
  };
  build: StandaloneBuildFlags;

  static createUserContext = (
    projectPath: string,
    exp: any,
    publishedUrl: ?string
  ): StandaloneContext => {
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
    // we never expect to handle the build step for user contexts right now
    context.build = StandaloneBuildFlags.createEmpty();
    return context;
  };

  static createServiceContext = (
    expoSourcePath: string,
    archivePath: ?string,
    manifest: ?any,
    privateConfig: ?any,
    testEnvironment: StandaloneContextTestEnvironment,
    build: StandaloneBuildFlags,
    publishedUrl: ?string,
    releaseChannel: ?string
  ): StandaloneContext => {
    let context = new StandaloneContext();
    context.type = 'service';
    context.data = {
      expoSourcePath,
      archivePath,
      manifest,
      privateConfig,
      testEnvironment,
    };
    context.config = manifest;
    context.build = build;
    context.published = {
      url: publishedUrl,
      releaseChannel: releaseChannel ? releaseChannel : 'default',
    };
    return context;
  };

  /**
   *  On iOS we begin configuring standalone apps before we have any information about the
   *  project's manifest.
   */
  isAnonymous = () => {
    return this.type === 'service' && !this.config;
  };
}

export default StandaloneContext;
