import { Mode } from '@expo/webpack-config/webpack/types';
import http from 'http';
import WebpackDevServer from 'webpack-dev-server';

export type DevServer = WebpackDevServer | http.Server;

export interface WebpackSettings {
  url: string;
  server: DevServer;
  port: number;
  protocol: Protocol;
  host?: string;
  https: boolean;
}

export type WebEnvironment = {
  projectRoot: string;
  isImageEditingEnabled: boolean;
  // deprecated
  pwa: boolean;
  mode: 'development' | 'production' | 'test' | 'none';
  https: boolean;
  info: boolean;
};

export type Protocol = 'http' | 'https';

export type CLIWebOptions = {
  dev?: boolean;
  pwa?: boolean;
  nonInteractive?: boolean;
  port?: number;
  unimodulesOnly?: boolean;
  onWebpackFinished?: (error?: Error) => void;
};

export type BundlingOptions = {
  dev?: boolean;
  pwa?: boolean;
  isImageEditingEnabled?: boolean;
  isDebugInfoEnabled?: boolean;
  webpackEnv?: Object;
  mode?: Mode;
  https?: boolean;
  nonInteractive?: boolean;
  unimodulesOnly?: boolean;
  onWebpackFinished?: (error?: Error) => void;
};
