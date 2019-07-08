import webpack from 'webpack';
import { Arguments, Environment } from './types';
export default function (env: Environment, argv: Arguments): Promise<webpack.Configuration>;
