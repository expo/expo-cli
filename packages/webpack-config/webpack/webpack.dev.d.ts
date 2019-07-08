import webpack from 'webpack';
import { Environment, Arguments } from './types.js';
export default function (env: Environment, argv: Arguments): Promise<webpack.Configuration>;
