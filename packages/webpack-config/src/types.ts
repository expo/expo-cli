import { Configuration as WebpackConfiguration } from 'webpack';
import {
  ProxyConfigArray,
  ProxyConfigMap,
  Configuration as WebpackDevServerConfiguration,
} from 'webpack-dev-server';

export interface DevConfiguration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

export type AnyConfiguration = DevConfiguration | WebpackConfiguration;

export type InputEnvironment = {
  projectRoot?: string;
  platform?: 'ios' | 'android' | 'web' | 'electron';
  info?: boolean;
  https?: boolean;
  production?: boolean;
  development?: boolean;
  config?: { [key: string]: any };
  locations?: FilePaths;
  polyfill?: boolean;
  mode?: Mode;
  removeUnusedImportExports?: boolean;
  pwa?: boolean;
  report?: {
    verbose: boolean;
    path: string;
    statsFilename: string;
    reportFilename: string;
  };
  babel?: {
    dangerouslyAddModulePathsToTranspile: string[];
  };
};

export type Environment = {
  info: boolean;
  https: boolean;
  config: { [key: string]: any };
  locations: FilePaths;
  projectRoot: string;
  polyfill?: boolean;
  mode: Mode;
  platform: 'ios' | 'android' | 'web' | 'electron';
  removeUnusedImportExports?: boolean;
  pwa?: boolean;
  report?: Report;
  babel?: {
    dangerouslyAddModulePathsToTranspile: string[];
  };
};

export type Report = {
  verbose: boolean;
  path: string;
  statsFilename: string;
  reportFilename: string;
};

type PathResolver = (...input: string[]) => string;

export interface FilePathsFolder {
  get: PathResolver;
  folder: string;
  indexHtml: string;
  manifest: string;
  serveJson: string;
  favicon: string;
  serviceWorker: string;
  registerServiceWorker: string;
}
export interface FilePaths {
  absolute: PathResolver;
  includeModule: PathResolver;
  template: FilePathsFolder;
  production: FilePathsFolder;
  packageJson: string;
  root: string;
  appMain: string | null;
  modules: string;
  servedPath: string;
  //   [route: string]: string | PathResolver | FilePathsFolder;
}

export type Mode = 'production' | 'development' | 'none';

export interface Arguments {
  allowedHost?: string;
  proxy?: ProxyConfigMap | ProxyConfigArray;
  [key: string]: any;
}
