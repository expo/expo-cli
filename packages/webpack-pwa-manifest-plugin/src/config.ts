import { ExpoConfig } from '@expo/config';
import isColor from 'is-color';

import { PresetError } from './Errors';
import validatePresets from './validators/Presets';
import { ManifestOptions } from './WebpackPWAManifestPlugin.types';

function isObject(item: any): boolean {
  return typeof item === 'object' && !Array.isArray(item) && item !== null;
}

export function createPWAManifestFromExpoConfig(appJson: ExpoConfig) {
  if (!isObject(appJson)) {
    throw new Error('app.json must be an object');
  }

  const { web = {} } = appJson.expo || appJson || {};

  return {
    // PWA
    background_color: web.backgroundColor,
    description: web.description,
    dir: web.dir,
    display: web.display,
    lang: web.lang,
    name: web.name,
    orientation: web.orientation,
    prefer_related_applications: web.preferRelatedApplications,
    related_applications: web.relatedApplications,
    scope: web.scope,
    short_name: web.shortName,
    start_url: web.startUrl,
    theme_color: web.themeColor,
    crossorigin: web.crossorigin,
    startupImages: web.startupImages,
    icons: web.icons,
  };
}

export function validateManifest(manifest: ManifestOptions): void {
  if (!manifest) return;

  validatePresets(manifest, 'dir', 'display', 'orientation', 'crossorigin');

  for (const property of ['background_color', 'theme_color']) {
    // @ts-ignore
    const color = manifest[property];
    if (color && !isColor(color)) {
      throw new PresetError(property, color);
    }
  }
}
