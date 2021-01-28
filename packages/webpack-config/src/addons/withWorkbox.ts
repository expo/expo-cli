import { ensureSlash } from '@expo/config/paths';
import CopyPlugin from 'copy-webpack-plugin';
import { joinUrlPath } from 'expo-pwa';
import { ensureDirSync, readFileSync, writeFileSync } from 'fs-extra';
import { join } from 'path';
import {
  GenerateSW,
  GenerateSWOptions,
  InjectManifest,
  InjectManifestOptions,
} from 'workbox-webpack-plugin';

import { getPaths } from '../env';
import { AnyConfiguration, Environment } from '../types';
import { resolveEntryAsync } from '../utils';

/**
 * @internal
 */
export type OfflineOptions = {
  projectRoot?: string;
  platform?: Environment['platform'];
  serviceWorkerPath?: string;
  autoRegister?: boolean;
  dev?: boolean;
  // https://developers.google.com/web/ilt/pwa/introduction-to-service-worker#registration_and_scope
  publicUrl?: string;
  scope?: string;
  // when `true` then `generateSWOptions` is used, otherwise `injectManifestOptions` is used.
  useServiceWorker?: boolean;
  generateSWOptions?: GenerateSWOptions;
  injectManifestOptions?: InjectManifestOptions;
};

const defaultInjectManifestOptions = {
  exclude: [
    /\.LICENSE$/,
    /\.map$/,
    /asset-manifest\.json$/,
    /\.js\.gz$/,
    // Exclude all apple touch and chrome images because they're cached locally after the PWA is added.
    /(apple-touch-startup-image|chrome-icon|apple-touch-icon).*\.png$/,
  ],
};

const runtimeCache = {
  handler: 'networkFirst',
  urlPattern: /^https?.*/,
  options: {
    cacheName: 'offlineCache',
    expiration: {
      maxEntries: 200,
    },
  },
};

const defaultGenerateSWOptions: GenerateSWOptions = {
  ...defaultInjectManifestOptions,
  clientsClaim: true,
  skipWaiting: true,
  navigateFallbackBlacklist: [
    // Exclude URLs starting with /_, as they're likely an API call
    new RegExp('^/_'),
    // Exclude URLs containing a dot, as they're likely a resource in
    // public/ and not a SPA route
    new RegExp('/[^/]+\\.[^/]+$'),
  ],
  // @ts-ignore: Webpack throws if `NetworkFirst` is not `networkFirst`
  runtimeCaching: [runtimeCache],
};

/**
 * Add offline support to the provided Webpack config.
 *
 * @param webpackConfig Existing Webpack config to modify.
 * @param options configure the service worker.
 * @category addons
 */
export default function withWorkbox(
  webpackConfig: AnyConfiguration,
  options: OfflineOptions = {}
): AnyConfiguration {
  if (!webpackConfig.plugins) webpackConfig.plugins = [];

  const {
    projectRoot,
    autoRegister = true,
    publicUrl = '',
    scope,
    useServiceWorker = true,
    generateSWOptions = {},
    injectManifestOptions = {},
  } = options;

  const locations = getPaths(projectRoot!, { platform: options.platform });

  webpackConfig.plugins.push(
    new CopyPlugin({
      patterns: [
        {
          force: true,
          from: locations.template.registerServiceWorker,
          to: locations.production.registerServiceWorker,
          transform(content) {
            return content
              .toString()
              .replace('SW_PUBLIC_URL', publicUrl)
              .replace('SW_PUBLIC_SCOPE', ensureSlash(scope || publicUrl, true));
          },
        },
      ],
    })
  );

  // Always register general service worker
  const expoEntry = webpackConfig.entry;
  webpackConfig.entry = async () => {
    const entries = await resolveEntryAsync(expoEntry);
    const swPath = join(locations.production.registerServiceWorker);
    if (entries.app && !entries.app.includes(swPath) && autoRegister) {
      let content = readFileSync(require.resolve(locations.template.registerServiceWorker), 'utf8');
      if (content) {
        content = content
          .replace('SW_PUBLIC_URL', publicUrl)
          .replace('SW_PUBLIC_SCOPE', ensureSlash(scope || publicUrl, true));
        ensureDirSync(locations.production.folder);
      } else {
        content = `
        console.warn("failed to load service-worker in @expo/webpack-config -> withWorkbox(). This can be due to the environment the project was built in. Please try again with a globally installed instance of expo-cli. If you continue to run into problems open an issue in https://github.com/expo/expo-cli")
        `;
      }
      writeFileSync(swPath, content, 'utf8');
      if (!Array.isArray(entries.app)) {
        entries.app = [entries.app];
      }
      entries.app.unshift(swPath);
    }
    return entries;
  };

  // ... but do not register Workbox in development
  if (webpackConfig.mode !== 'production') {
    return webpackConfig;
  }

  const customManifestProps = {
    navigateFallback: joinUrlPath(publicUrl, 'index.html'),
  };

  if (useServiceWorker) {
    webpackConfig.plugins.push(
      new GenerateSW({
        ...defaultGenerateSWOptions,
        ...customManifestProps,
        ...generateSWOptions,
      })
    );
  } else {
    const props = {
      ...defaultInjectManifestOptions,
      ...customManifestProps,
      ...injectManifestOptions,
    };

    webpackConfig.plugins.push(
      // @ts-ignore: unused swSrc
      new InjectManifest(props)
    );
  }

  return webpackConfig;
}
