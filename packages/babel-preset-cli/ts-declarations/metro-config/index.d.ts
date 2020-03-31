declare module 'metro-config' {
  import { InputConfigT } from './src/configTypes';

  interface CosmiConfigResult {
    filepath: string;
    isEmpty: boolean;
    config: ((arg: ConfigT) => Promise<ConfigT>) | ((arg: ConfigT) => ConfigT) | InputConfigT;
  }

  interface YargArguments {
    config?: string;
    cwd?: string;
    port?: string | number;
    host?: string;
    projectRoot?: string;
    watchFolders?: Array<string>;
    assetExts?: Array<string>;
    sourceExts?: Array<string>;
    platforms?: Array<string>;
    'max-workers'?: string | number;
    maxWorkers?: string | number;
    transformer?: string;
    'reset-cache'?: boolean;
    resetCache?: boolean;
    runInspectorProxy?: boolean;
    verbose?: boolean;
  }

  export function resolveConfig(path?: string, cwd?: string): Promise<CosmiConfigResult>;

  export function mergeConfig<T extends InputConfigT>(
    defaultConfig: T,
    ...configs: Array<InputConfigT>
  ): T;

  export function loadConfig(
    argv: YargArguments = {},
    defaultConfigOverrides: InputConfigT = {}
  ): Promise<ConfigT>;
}
