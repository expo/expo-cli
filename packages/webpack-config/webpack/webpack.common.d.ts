import webpack from 'webpack';
import { Environment, Arguments } from './types';
export default function (env: Environment, argv: Arguments): Promise<webpack.Configuration>;
