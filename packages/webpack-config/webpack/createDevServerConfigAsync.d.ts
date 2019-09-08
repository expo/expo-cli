import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';
import { Arguments, Environment } from './types';
export default function createDevServerConfigAsync(env: Environment, argv: Arguments): Promise<WebpackDevServerConfiguration>;
