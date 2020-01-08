import { ExpoConfig, getConfigForPWA } from '@expo/config';
import {
  getAbsolutePathWithProjectRoot,
  getManagedExtensions,
  getPossibleProjectRoot,
} from '@expo/config/paths';
import { AnyConfiguration } from '@expo/webpack-config/webpack/types';
import { NextConfig } from 'next';
// @ts-ignore: no types found
import pwaManifest from '@pwa/manifest';

function isObject(item: any): boolean {
  return typeof item === 'object' && !Array.isArray(item) && item !== null;
}

function createPWAManifestFromExpoConfig(appJson: ExpoConfig): any {
  if (!isObject(appJson)) {
    throw new Error('app.json must be an object');
  }

  const { web = {} } = appJson;

  const manifest: any = {
    // PWA
    background_color: web.backgroundColor,
    description: web.description,
    dir: web.dir,
    display: web.display,
    lang: web.lang,
    name: web.name,
    orientation: web.orientation,
    scope: web.scope,
    short_name: web.shortName,
    start_url: web.startUrl || '/?utm_source=web_app_manifest',
    theme_color: web.themeColor,
    crossorigin: web.crossorigin,
    // startupImages: web.startupImages,
    // icons: web.icons,
  };

  if (Array.isArray(web.relatedApplications) && web.relatedApplications.length > 0) {
    manifest.related_applications = web.relatedApplications;
    manifest.prefer_related_applications = web.preferRelatedApplications;
  }

  return manifest;
}

export default function withExpoPWA(nextConfig: NextConfig = {}): NextConfig {
  return {
    ...nextConfig,
    pageExtensions: getManagedExtensions(['web']),
    webpack(config: AnyConfiguration, options: any): AnyConfiguration {
      // Gather options
      const { isServer, dev: isDev } = options;

      const {
        projectRoot = getPossibleProjectRoot(),
        // Devs should use the app.json instead.
        manifest = {},
      } = nextConfig;

      // Possibly generate PWA manifest from Expo config
      if (!isDev) {
        // Attempt to find the output path
        const outputPath = `${isServer ? '../' : ''}static/`;

        // Get a filled in Expo config
        const expoConfig = getConfigForPWA(
          projectRoot,
          (...pathComponents) => getAbsolutePathWithProjectRoot(projectRoot, ...pathComponents),
          {}
        );

        const writtenManifest = pwaManifest.sync({
          // Convert the Expo config into a PWA manifest
          ...createPWAManifestFromExpoConfig(expoConfig),
          // Allow for overrides
          ...manifest,
        });

        // Write manifest
        pwaManifest.writeSync(outputPath, writtenManifest);
      }

      // Clean up...
      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  };
}
