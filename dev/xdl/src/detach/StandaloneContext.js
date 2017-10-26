/**
 * @flow
 */

type StandaloneContextDataType = 'user' | 'service';
type StandaloneContextDataUser = {
  projectPath: string,
  exp: any,
};
type StandaloneContextDataService = {
  expoSourcePath: string,
  manifest: any,
  privateConfig: any,
};

class StandaloneContext {
  type: StandaloneContextDataType;
  data: StandaloneContextDataUser | StandaloneContextDataService;
  config: any; // same as underlying exp or manifest

  static createUserContext = (
    projectPath: string,
    exp: any
  ): StandaloneContext => {
    let context = new StandaloneContext();
    context.type = 'user';
    context.data = {
      projectPath,
      exp,
    };
    context.config = exp;
    return context;
  };

  static createServiceContext = (
    expoSourcePath: string,
    manifest: any,
    privateConfig: any
  ): StandaloneContext => {
    let context = new StandaloneContext();
    context.type = 'service';
    context.data = {
      expoSourcePath,
      manifest,
      privateConfig,
    };
    context.config = manifest;
    return context;
  };
}

export default StandaloneContext;
