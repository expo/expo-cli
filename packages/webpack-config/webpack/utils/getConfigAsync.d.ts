import { ExpoConfig } from '@expo/config';
import { Environment } from '../types';
declare function getConfigAsync(env: Environment): Promise<ExpoConfig>;
export default getConfigAsync;
