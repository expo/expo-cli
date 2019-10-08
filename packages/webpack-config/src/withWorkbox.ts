import { readFile, writeFile } from 'fs-extra';
import { join } from 'path';
import { Entry } from 'webpack';
import {
  GenerateSW,
  GenerateSWOptions,
  InjectManifest,
  InjectManifestOptions,
} from 'workbox-webpack-plugin';

import { AnyConfiguration } from './types';
import { isEntry } from './utils/loaders';

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
    /^\bapple.*\.png$/,
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

export async function ensureEntryAsync(arg: any): Promise<Entry> {
  if (typeof arg === 'undefined') {
    throw new Error('Webpack config entry cannot be undefined');
  }

  if (typeof arg === 'function') {
    return ensureEntryAsync(await arg());
  } else if (typeof arg === 'string') {
    return ensureEntryAsync([arg]);
  } else if (Array.isArray(arg)) {
    return {
      app: arg,
    };
  } else if (isEntry(arg)) {
    return arg;
  }

  throw new Error('Cannot resolve Webpack config entry prop: ' + arg);
}

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
    const entries = await ensureEntryAsync(expoEntry);
    const swPath = join(projectRoot!, 'register-service-worker.js');
    if (entries.app && !entries.app.includes(swPath) && autoRegister) {
      const content = (await readFile(
        require.resolve('../web-default/register-service-worker.js'),
        'utf8'
      ))
        .replace('SW_PUBLIC_URL', publicUrl)
        .replace('SW_PUBLIC_SCOPE', scope);
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
