import { ensureDir, readFile, writeFile } from 'fs-extra';
import { join } from 'path';
import { Entry } from 'webpack';
import {
  GenerateSW,
  GenerateSWOptions,
  InjectManifest,
  InjectManifestOptions,
} from 'workbox-webpack-plugin';

import { AnyConfiguration } from '../types';
import { resolveEntryAsync } from '../utils';
import { getPaths } from '../env';

export type OfflineOptions = {
  projectRoot?: string;
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
    // Exclude all apple touch images because they're cached locally after the PWA is added.
    // /^\bapple.*\.png$/,
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

export default function withWorkbox(
  config: AnyConfiguration,
  options: OfflineOptions = {}
): AnyConfiguration {
  // Do nothing in dev mode
  if (config.mode !== 'production') {
    return config;
  }

  if (!config.plugins) config.plugins = [];

  const {
    projectRoot,
    autoRegister = true,
    publicUrl = '',
    scope = '/',
    useServiceWorker = true,
    generateSWOptions = {},
    injectManifestOptions = {},
  } = options;

  const locations = getPaths(projectRoot!);

  const customManifestProps = {
    navigateFallback: join(publicUrl, 'index.html'),
  };

  if (useServiceWorker) {
    config.plugins.push(
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

    config.plugins.push(
      // @ts-ignore: unused swSrc
      new InjectManifest(props)
    );
  }

  const expoEntry = config.entry;
  config.entry = async () => {
    const entries = await resolveEntryAsync(expoEntry);
    const swPath = join(locations.production.registerServiceWorker);
    if (entries.app && !entries.app.includes(swPath) && autoRegister) {
      const content = (
        await readFile(require.resolve(locations.template.registerServiceWorker), 'utf8')
      )
        .replace('SW_PUBLIC_URL', publicUrl)
        .replace('SW_PUBLIC_SCOPE', scope);
      await ensureDir(locations.production.folder);
      await writeFile(swPath, content, 'utf8');

      if (!Array.isArray(entries.app)) {
        entries.app = [entries.app];
      }
      entries.app.unshift(swPath);
    }
    return entries;
  };

  return config;
}
