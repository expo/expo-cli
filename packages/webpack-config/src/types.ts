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

type AnyObject = { [key: string]: any };

export type InputEnvironment = {
  projectRoot?: string;
  platform?: 'ios' | 'android' | 'web' | 'electron';
  info?: boolean;
  https?: boolean;
  production?: boolean;
  development?: boolean;
  config?: AnyObject;
  locations?: FilePaths;
  polyfill?: boolean;
  mode?: Mode;
  removeUnusedImportExports?: boolean;
  pwa?: boolean;
  offline?: boolean;
  babel?: {
    dangerouslyAddModulePathsToTranspile: string[];
  };
};

export type Environment = {
  /**
   * Should the dev server use https protocol.
   *
   * @default false
   */
  https: boolean;
  /**
   * The Expo project config, this should be read using `@expo/config`.
   *
   * @default undefined
   */
  config: { [key: string]: any };
  /**
   * Paths used to locate where things are.
   */
  locations: FilePaths;
  /**
   * Root of the Expo project.
   */
  projectRoot: string;
  /**
   * Passing `true` will disable offline support and skip adding a service worker.
   *
   * @default true
   */
  offline?: boolean;
  /**
   * The Webpack mode to bundle the project in.
   */
  mode: Mode;
  /**
   * The target platform to bundle for. Currently only `web` and `electron` are supported.
   */
  platform: ExpoPlatform;
  /**
   * Enables advanced tree-shaking with deep scope analysis.
   *
   * @default false
   */
  removeUnusedImportExports?: boolean;
  /**
   * Generate the PWA image assets in production mode.
   *
   * @default true
   */
  pwa?: boolean;
  /**
   * Control how the default Babel loader is configured.
   */
  babel?: ExpoBabelOptions;
  /**
   * Includes all Babel polyfills.
   *
   * @deprecated
   */
  polyfill?: boolean;
};

/**
 * The target platform to bundle for. Currently only `web` and `electron` are supported.
 */
export type ExpoPlatform = 'ios' | 'android' | 'web' | 'electron';

/**
 * Control how the default Babel loader is configured.
 */
export type ExpoBabelOptions = {
  /**
   * Add the names of node_modules that should be included transpilation step.
   */
  dangerouslyAddModulePathsToTranspile: string[];
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
