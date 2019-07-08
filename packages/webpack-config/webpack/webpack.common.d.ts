import webpack from 'webpack';
import { Arguments } from './types';
export default function (env: {} | undefined, argv: Arguments): Promise<webpack.Configuration>;
