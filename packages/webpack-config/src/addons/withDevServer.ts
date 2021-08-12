import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs-extra';
import { boolish } from 'getenv';
import * as path from 'path';
// @ts-ignore
import evalSourceMapMiddleware from 'react-dev-utils/evalSourceMapMiddleware';
import ignoredFiles from 'react-dev-utils/ignoredFiles';
import noopServiceWorkerMiddleware from 'react-dev-utils/noopServiceWorkerMiddleware';
import redirectServedPath from 'react-dev-utils/redirectServedPathMiddleware';
import { Configuration } from 'webpack';
import {
  ProxyConfigArray,
  ProxyConfigMap,
  Configuration as WebpackDevServerConfiguration,
} from 'webpack-dev-server';

import { getPaths, getPublicPaths } from '../env';
import { Environment } from '../types';

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
const sockHost = process.env.WDS_SOCKET_HOST;
const sockPath = process.env.WDS_SOCKET_PATH; // default: '/ws'
const sockPort = process.env.WDS_SOCKET_PORT;

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
  webpackConfig: Configuration,
  env: SelectiveEnv,
  options: DevServerOptions = {}
): Configuration {
  if (webpackConfig?.mode === 'development') {
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
  const isNative = ['ios', 'android'].includes(env.platform);
  const { publicPath: publicUrlOrPath } = getPublicPaths(env);
  // Because native React runtimes uses .bundle we must make
  // the .bundle extension be served as javascript.
  const mimeTypes: any = isNative
    ? {
        typeMap: { 'application/javascript': ['bundle'] },
        force: true,
      }
    : undefined;

  const disableFirewall = !proxy || process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true';

  // Attempt to keep this as close to create-react-native app as possible.
  // https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/config/webpackDevServer.config.js
  return {
    // WebpackDevServer 2.4.3 introduced a security fix that prevents remote
    // websites from potentially accessing local content through DNS rebinding:
    // https://github.com/webpack/webpack-dev-server/issues/887
    // https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
    // However, it made several existing use cases such as development in cloud
    // environment or subdomains in development significantly more complicated:
    // https://github.com/facebook/create-react-app/issues/2271
    // https://github.com/facebook/create-react-app/issues/2233
    // While we're investigating better solutions, for now we will take a
    // compromise. Since our WDS configuration only serves files in the `public`
    // folder we won't consider accessing them a vulnerability. However, if you
    // use the `proxy` feature, it gets more dangerous because it can expose
    // remote code execution vulnerabilities in backends like Django and Rails.
    // So we will disable the host check normally, but enable it if you have
    // specified the `proxy` setting. Finally, we let you override it if you
    // really know what you're doing with a special environment variable.
    // Note: ["localhost", ".localhost"] will support subdomains - but we might
    // want to allow setting the allowedHosts manually for more complex setups
    allowedHosts: disableFirewall ? ['all'] : [allowedHost],
    // Enable gzip compression of generated files.
    compress: true,
    static: {
      // By default WebpackDevServer serves physical files from current directory
      // in addition to all the virtual build products that it serves from memory.
      // This is confusing because those files won’t automatically be available in
      // production build folder unless we copy them. However, copying the whole
      // project directory is dangerous because we may expose sensitive files.
      // Instead, we establish a convention that only files in `public` directory
      // get served. Our build script will copy `public` into the `build` folder.
      // In `index.html`, you can get URL of `public` folder with %PUBLIC_URL%:
      // <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
      // In JavaScript code, you can access it with `process.env.PUBLIC_URL`.
      // Note that we only recommend to use `public` folder as an escape hatch
      // for files like `favicon.ico`, `manifest.json`, and libraries that are
      // for some reason broken when imported through webpack. If you just want to
      // use an image, put it in `src` and `import` it from JavaScript instead.
      directory: locations.template.folder,
      publicPath: [publicUrlOrPath],
      // By default files from `contentBase` will not trigger a page reload.
      watch: {
        // Reportedly, this avoids CPU overload on some systems.
        // https://github.com/facebook/create-react-app/issues/293
        // src/node_modules is not ignored to support absolute imports
        // https://github.com/facebook/create-react-app/issues/1065
        ignored: ignoredFiles(locations.root),
      },
    },
    client: {
      webSocketURL: {
        // Enable custom sockjs pathname for websocket connection to hot reloading server.
        // Enable custom sockjs hostname, pathname and port for websocket connection
        // to hot reloading server.
        hostname: sockHost,
        pathname: sockPath,
        port: sockPort,
      },
      overlay: true,
      // TODO: This is nonstandard, prevents logging in the browser
      logging: 'none',
    },
    devMiddleware: {
      // It is important to tell WebpackDevServer to use the same "publicPath" path as
      // we specified in the webpack config. When homepage is '.', default to serving
      // from the root.
      // remove last slash so user can land on `/test` instead of `/test/`
      publicPath: publicUrlOrPath.slice(0, -1),
    },

    https: getHttpsConfig(env.projectRoot, https),
    host,
    historyApiFallback: {
      // Paths with dots should still use the history fallback.
      // See https://github.com/facebook/create-react-app/issues/387.
      disableDotRule: true,
      index: publicUrlOrPath,
    },

    // `proxy` is run between `before` and `after` `webpack-dev-server` hooks
    proxy,
    onBeforeSetupMiddleware(app, server) {
      // Everything we add here is for web support
      if (isNative) {
        return;
      }
      // Keep `evalSourceMapMiddleware`
      // middlewares before `redirectServedPath` otherwise will not have any effect
      // This lets us fetch source contents from webpack for the error overlay
      app.use(evalSourceMapMiddleware(server));
    },
    onAfterSetupMiddleware(app) {
      // Redirect to `PUBLIC_URL` or `homepage` from `package.json` if url not match
      app.use(redirectServedPath(publicUrlOrPath));

      if (isNative) {
        return;
      }

      // This service worker file is effectively a 'no-op' that will reset any
      // previous service worker registered for the same host:port combination.
      // We do this in development to avoid hitting the production cache if
      // it used the same host and port.
      // https://github.com/facebook/create-react-app/issues/2272#issuecomment-302832432
      app.use(noopServiceWorkerMiddleware(publicUrlOrPath));
    },

    // // TODO: Verify these work in Webpack 5 on web

    // // Without disabling this on native, you get the error `Can't find variable self`.
    // inline: !isNative,
    // // Specify the mimetypes for hosting native bundles.
    // mimeTypes,
  };
}
