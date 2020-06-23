import { ExpoConfig } from '@expo/config';
import { URLOptions } from '../../urlOpts';

export type NormalizedOptions = URLOptions & {
  webOnly?: boolean;
  dev?: boolean;
  minify?: boolean;
  https?: boolean;
  nonInteractive?: boolean;
  clear?: boolean;
  maxWorkers?: number;
  sendTo?: string;
  host?: string;
  lan?: boolean;
  localhost?: boolean;
  tunnel?: boolean;
};

export type Options = NormalizedOptions & {
  parent?: { nonInteractive: boolean; rawArgs: string[] };
};

export type OpenDevToolsOptions = {
  rootPath: string;
  exp: ExpoConfig;
  options: NormalizedOptions;
};
