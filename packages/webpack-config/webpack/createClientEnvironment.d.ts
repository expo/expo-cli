/**
 * This creates environment variables that won't be tree shaken.
 */
import { Mode } from './types';
declare function createClientEnvironment(mode: Mode, publicPath: string, nativeAppManifest: any): {
    'process.env': {
        /**
         * Useful for determining whether we’re running in production mode.
         * Most importantly, it switches React into the correct mode.
         */
        NODE_ENV: string;
        /**
         * Useful for resolving the correct path to static assets in `public`.
         * For example, <img src={process.env.PUBLIC_URL + '/img/logo.png'} />.
         * This should only be used as an escape hatch. Normally you would put
         * images into the root folder and `import` them in code to get their paths.
         */
        PUBLIC_URL: string;
        /**
         * Surfaces the `app.json` (config) as an environment variable which is then parsed by
         * `expo-constants` https://docs.expo.io/versions/latest/sdk/constants/
         */
        APP_MANIFEST: string;
    };
    __DEV__: boolean;
};
export default createClientEnvironment;
