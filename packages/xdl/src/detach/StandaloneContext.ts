import StandaloneBuildFlags from './StandaloneBuildFlags';

type StandaloneContextDataType = 'user' | 'service';

type StandaloneContextTestEnvironment = 'none' | 'local' | 'ci';

// currently unused
export function isStandaloneContextDataUser(value: any): value is StandaloneContextDataUser {
  return value && typeof value.projectPath === 'string' && 'exp' in value;
}

export function isStandaloneContextTestEnvironment(
  value: string
): value is StandaloneContextTestEnvironment {
  return ['none', 'local', 'ci'].includes(value);
}

export function isStandaloneContextDataService(value: any): value is StandaloneContextDataService {
  return (
    value &&
    isStandaloneContextTestEnvironment(value.testEnvironment) &&
    typeof value.expoSourcePath === 'string' &&
    typeof value.shellAppSdkVersion === 'string'
  );
}

/**
 *  A user context is used when we are configuring a standalone app locally on a user's machine,
 *  such as during `exp detach`.
 */
export type StandaloneContextDataUser = {
  projectPath: string;
  exp: any;
};

/**
 *  A service context is used when we are generating a standalone app remotely on an Expo
 *  service machine, such as during `exp build`.
 */
export type StandaloneContextDataService = {
  expoSourcePath: string;
  archivePath: string | null;
  manifest: any;
  privateConfig: any;
  testEnvironment: StandaloneContextTestEnvironment;
  shellAppSdkVersion: string;
};

class StandaloneContext {
  data?: StandaloneContextDataUser | StandaloneContextDataService;
  config: any; // same as underlying app.json or manifest

  static createUserContext = (
    projectPath: string,
    exp: any,
    publishedUrl?: string
  ): StandaloneContextUser => {
    const context = new StandaloneContextUser(
      {
        projectPath,
        exp,
      },
      {
        url: publishedUrl,
        releaseChannel: 'default',
      },
      // we never expect to handle the build step for user contexts right now
      StandaloneBuildFlags.createEmpty()
    );
    context.config = exp;
    return context;
  };

  static createServiceContext = (
    expoSourcePath: string,
    archivePath: string | null,
    manifest: any,
    privateConfig: any,
    testEnvironment: StandaloneContextTestEnvironment,
    build: StandaloneBuildFlags,
    publishedUrl: string,
    releaseChannel: string,
    shellAppSdkVersion: string
  ): StandaloneContextService => {
    const context = new StandaloneContextService(
      {
        expoSourcePath,
        archivePath,
        manifest,
        privateConfig,
        testEnvironment,
        shellAppSdkVersion,
      },
      {
        url: publishedUrl,
        releaseChannel: releaseChannel ? releaseChannel : 'default',
      },
      build
    );
    context.config = manifest;

    return context;
  };

  /**
   *  On iOS we begin configuring standalone apps before we have any information about the
   *  project's manifest. By default let's treat all contexts as non-anonymous and override
   *  it in contexts that needs this to be different.
   */
  isAnonymous() {
    return false;
  }
}

export class StandaloneContextUser extends StandaloneContext {
  type: StandaloneContextDataType = 'user';
  constructor(
    public data: StandaloneContextDataUser,
    public published: {
      url?: string;
      releaseChannel: 'default';
    },
    public build: StandaloneBuildFlags
  ) {
    super();
  }
}

export class StandaloneContextService extends StandaloneContext {
  type: StandaloneContextDataType = 'service';
  constructor(
    public data: StandaloneContextDataService,
    public published: {
      url: string;
      releaseChannel: string;
    },
    public build: StandaloneBuildFlags
  ) {
    super();
  }

  /**
   *  On iOS we begin configuring standalone apps before we have any information about the
   *  project's manifest.
   */
  isAnonymous() {
    return true;
  }
}

export type AnyStandaloneContext = StandaloneContextUser | StandaloneContextService;

export default StandaloneContext;
