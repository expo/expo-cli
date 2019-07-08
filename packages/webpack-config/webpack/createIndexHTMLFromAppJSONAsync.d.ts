import HtmlWebpackPlugin from 'html-webpack-plugin';
import { Environment } from './types';
export default function createIndexHTMLFromAppJSONAsync(env: Environment): Promise<HtmlWebpackPlugin>;
