/**
 * This creates environment variables that won't be tree shaken.
 */
import { ExpoConfig } from '@expo/config';
import { Mode } from './types';
export interface ClientEnv {
    __DEV__: boolean;
    'process.env': {
        [key: string]: string;
    };
}
declare function createClientEnvironment(mode: Mode, publicPath: string, nativeAppManifest: ExpoConfig): ClientEnv;
export default createClientEnvironment;
