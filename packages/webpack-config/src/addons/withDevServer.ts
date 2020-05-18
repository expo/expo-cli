import errorOverlayMiddleware from 'react-dev-utils/errorOverlayMiddleware';
// @ts-ignore
import evalSourceMapMiddleware from 'react-dev-utils/evalSourceMapMiddleware';
import noopServiceWorkerMiddleware from 'react-dev-utils/noopServiceWorkerMiddleware';
import {
  ProxyConfigArray,
  ProxyConfigMap,
  Configuration as WebpackDevServerConfiguration,
} from 'webpack-dev-server';

import fs from 'fs-extra';
import * as path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';
import { getPaths } from '../env';
import { AnyConfiguration, DevConfiguration, Environment } from '../types';

// Ensure the certificate and key provided are valid and if not
// throw an easy to debug error
function validateKeyAndCerts({ cert, key, keyFile, crtFile }: any): boolean {
  let encrypted;
  try {
    // publicEncrypt will throw an error with an invalid cert
    encrypted = crypto.publicEncrypt(cert, Buffer.from('test'));
  } catch (err) {
    return false;
  }

  try {
    // privateDecrypt will throw an error with an invalid key
    crypto.privateDecrypt(key, encrypted);
  } catch (err) {
    return false;
  }
  return true;
}

// Read file and throw an error if it doesn't exist
function readEnvFile(file: string, type: string): any {
  if (!fs.existsSync(file)) {
    throw new Error(
      `You specified ${chalk.cyan(type)} in your env, but the file "${chalk.yellow(
        file
      )}" can't be found.`
    );
  }
  return fs.readFileSync(file);
}

// Get the https config
// Return cert files if provided in env, otherwise just true or false
function getHttpsConfig(projectRoot: string, isHttps: boolean): any {
  const { SSL_CRT_FILE, SSL_KEY_FILE } = process.env;

  if (isHttps && SSL_CRT_FILE && SSL_KEY_FILE) {
    const crtFile = path.resolve(projectRoot, SSL_CRT_FILE);
    const keyFile = path.resolve(projectRoot, SSL_KEY_FILE);
    const config = {
      cert: readEnvFile(crtFile, 'SSL_CRT_FILE'),
      key: readEnvFile(keyFile, 'SSL_KEY_FILE'),
    };

    if (validateKeyAndCerts({ ...config, keyFile, crtFile })) {
      return config;
    } else {
      console.log(
        chalk.yellow(
          `\u203A Failed to self-sign SSL certificates for HTTPS. Falling back to insecure https. You can re run with \`--no-https\` to disable HTTPS, or delete the \`.expo\` folder and try again.`
        )
      );
      return true;
    }
  }
  return isHttps;
}

// @ts-ignore
const host = process.env.HOST || '0.0.0.0';

/**
 *
 * @param input
 * @internal
 */
export function isDevConfig(input: AnyConfiguration): input is DevConfiguration {
  return input && input.mode === 'development';
}

type SelectiveEnv = Pick<Environment, 'mode' | 'locations' | 'projectRoot' | 'https' | 'platform'>;

type DevServerOptions = {
  allowedHost?: string;
  proxy?: ProxyConfigMap | ProxyConfigArray;
};

/**
 * Add a valid dev server to the provided Webpack config.
 *
 * @param webpackConfig Existing Webpack config to modify.
 * @param env locations, projectRoot, and https options.
 * @param options Configure how the dev server is setup.
 * @category addons
 */
export default function withDevServer(
  webpackConfig: AnyConfiguration,
  env: SelectiveEnv,
  options: DevServerOptions = {}
): AnyConfiguration {
  if (isDevConfig(webpackConfig)) {
    webpackConfig.devServer = createDevServer(env, options);
  }
  return webpackConfig;
}

/**
 * Create a valid Webpack dev server config.
 *
 * @param env locations, projectRoot, and https options.
 * @param options Configure how the dev server is setup.
 * @internal
 */
export function createDevServer(
  env: SelectiveEnv,
  { allowedHost, proxy }: DevServerOptions = {}
): WebpackDevServerConfiguration {
  const { https = false } = env;
  const locations = env.locations || getPaths(env.projectRoot, env);
  // https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/config/webpackDevServer.config.js
  return {
    // Enable gzip compression of generated files.
    compress: true,
    // Silence WebpackDevServer's own logs since they're generally not useful.
    // It will still show compile warnings and errors with this setting.
    clientLogLevel: 'none',
    // https://github.com/facebook/create-react-app/blob/e59e0920f3bef0c2ac47bbf6b4ff3092c8ff08fb/packages/react-scripts/config/webpackDevServer.config.js#L46
    // By default WebpackDevServer serves physical files from current directory
    // in addition to all the virtual build products that it serves from memory.
    // This is confusing because those files won’t automatically be available in
    // production build folder unless we copy them. However, copying the whole
    // project directory is dangerous because we may expose sensitive files.
    // Instead, we establish a convention that only files in `public` directory
    // get served. Our build script will copy `public` into the `build` folder.
    // In `index.html`, you can get URL of `public` folder with %WEB_PUBLIC_URL%:
    // <link rel="shortcut icon" href="%WEB_PUBLIC_URL%/favicon.ico">
    // In JavaScript code, you can access it with `process.env.WEB_PUBLIC_URL`.
    // Note that we only recommend to use `public` folder as an escape hatch
    // for files like `favicon.ico`, `manifest.json`, and libraries that are
    // for some reason broken when imported through Webpack. If you just want to
    // use an image, put it in `src` and `import` it from JavaScript instead.
    contentBase: locations.template.folder,
    // By default files from `contentBase` will not trigger a page reload.
    watchContentBase: true,
    // Enable hot reloading server. It will provide /sockjs-node/ endpoint
    // for the WebpackDevServer client so it can learn when the files were
    // updated. The WebpackDevServer client is included as an entry point
    // in the Webpack development configuration. Note that only changes
    // to CSS are currently hot reloaded. JS changes will refresh the browser.
    hot: true,
    // It is important to tell WebpackDevServer to use the same "root" path
    // as we specified in the config. In development, we always serve from /.
    publicPath: '/',
    // WebpackDevServer is noisy by default so we emit custom message instead
    // by listening to the compiler events with `compiler.hooks[...].tap` calls above.
    quiet: true,

    host,
    overlay: false,
    historyApiFallback: {
      // Paths with dots should still use the history fallback.
      // See https://github.com/facebook/create-react-app/issues/387.
      disableDotRule: true,
    },
    public: allowedHost,
    proxy,

    before(app, server) {
      // if (fs.existsSync(paths.proxySetup)) {
      //   // This registers user provided middleware for proxy reasons
      //   require(paths.proxySetup)(app);
      // }

      // This lets us fetch source contents from webpack for the error overlay
      app.use(evalSourceMapMiddleware(server));
      // This lets us open files from the runtime error overlay.
      app.use(errorOverlayMiddleware());

      // This service worker file is effectively a 'no-op' that will reset any
      // previous service worker registered for the same host:port combination.
      // We do this in development to avoid hitting the production cache if
      // it used the same host and port.
      // https://github.com/facebookincubator/create-react-app/issues/2272#issuecomment-302832432
      app.use(noopServiceWorkerMiddleware());
    },

    // We don't use watchOptions: https://github.com/facebook/create-react-app/blob/e59e0920f3bef0c2ac47bbf6b4ff3092c8ff08fb/packages/react-scripts/config/webpackDevServer.config.js#L79

    // Enable HTTPS if the HTTPS environment variable is set to 'true'
    // https: protocol === 'https',

    https: getHttpsConfig(env.projectRoot, https),
    disableHostCheck: !proxy,
    // allowedHosts: [host, 'localhost'],
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
  };
}
