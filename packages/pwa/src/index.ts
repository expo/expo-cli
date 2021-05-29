import { ExpoConfig, setCustomConfigPath } from '@expo/config';
import * as Image from '@expo/image-utils';
import * as path from 'path';
import { URL } from 'url';

import { createPWAManifestFromWebConfig, getConfigForPWA } from './Manifest';
import { HTMLOutput, IconOptions, Manifest, ProjectOptions, SplashIcon } from './Manifest.types';
import { assembleOrientationMedia, getDevices } from './Splash';

/**
 * Joins a url protocol + host to path segments, falls back to path.join
 * if result is not a valid url.
 */
export function joinUrlPath(publicPath: string, ...toJoin: string[]): string {
  const segments = path.join(...toJoin);
  try {
    // Throws if publicPath is not a valid protocol+host
    return new URL(segments, publicPath).href;
  } catch {
    return path.join(publicPath, segments);
  }
}

export async function generateAsync(
  type: string,
  options: ProjectOptions,
  icon: IconOptions
): Promise<HTMLOutput[]> {
  switch (type) {
    case 'splash':
      return generateSplashAsync(options, icon);
    case 'safari-icon':
      return generateAppleIconAsync(options, icon, {});
    case 'chrome-icon':
      return generateChromeIconAsync(options, icon, {});
    case 'favicon':
      return generateFaviconAsync(options, icon);
  }
  throw new Error(`Invalid command type: ${type}`);
}

export async function generateSplashAsync(
  { projectRoot, publicPath }: ProjectOptions,
  icon: IconOptions
): Promise<HTMLOutput[]> {
  const cacheType = 'apple-touch-startup-image';

  // You cannot lock iOS PWA orientation, we should produce every splash screen
  // orientation. We don't however because in iOS 13 it's far more rare to see landscape splash screens.
  const devices = getDevices();

  const icons: SplashIcon[] = Array.isArray(icon) ? icon : [];
  if (!Array.isArray(icon)) {
    for (const device of devices) {
      for (const orientation of device.orientations) {
        let width = 0;
        let height = 0;
        if (orientation !== 'portrait') {
          width = device.height;
          height = device.width;
        } else {
          height = device.height;
          width = device.width;
        }

        const name = `apple-touch-startup-image-${width}x${height}.png`;
        icons.push({
          ...icon,
          name,
          width,
          height,
          media: assembleOrientationMedia(device.width, device.height, device.scale, orientation),
        });
      }
    }
  }

  const data = await Promise.all<HTMLOutput>(
    icons.map(
      async (icon: SplashIcon): Promise<HTMLOutput> => {
        // Ensure the default `splash.resizeMode` is used here:
        // https://docs.expo.io/versions/latest/config/app/#splash
        if (!icon.resizeMode) {
          icon.resizeMode = 'contain';
        }
        const { source, name } = await Image.generateImageAsync({ projectRoot, cacheType }, icon);

        const href = `pwa/apple-touch-startup-image/${name}`;

        return {
          asset: {
            source,
            path: href,
          },
          tag: {
            tagName: 'link',
            attributes: {
              rel: 'apple-touch-startup-image',
              media: icon.media,
              // TODO(Bacon): Use sizes to query splash screens better
              // sizes: `${icon.width}x${icon.height}`,
              href: joinUrlPath(publicPath, href),
            },
          },
        };
      }
    )
  );

  await Image.Cache.clearUnusedCachesAsync(projectRoot, cacheType);

  return data;
}

export async function generateAppleIconAsync(
  { projectRoot, publicPath }: ProjectOptions,
  icon: IconOptions,
  { sizes = [180] }: { sizes?: number[] }
): Promise<HTMLOutput[]> {
  const cacheType = 'apple-touch-icon';

  const data = await Promise.all<HTMLOutput>(
    sizes.map(
      async (size: number): Promise<HTMLOutput> => {
        const rel = 'apple-touch-icon';
        const { source, name } = await Image.generateImageAsync(
          { projectRoot, cacheType },
          { ...icon, width: size, height: size, name: `${rel}-${size}.png` }
        );

        const href = `pwa/${rel}/${name}`;

        return {
          asset: {
            source,
            path: href,
          },
          tag: {
            tagName: 'link',
            attributes: {
              rel,
              sizes: `${size}x${size}`,
              href: joinUrlPath(publicPath, href),
            },
          },
        };
      }
    )
  );

  // Don't clear the caches if no generation was performed.
  if (!sizes.length) {
    await Image.Cache.clearUnusedCachesAsync(projectRoot, cacheType);
  }

  return data;
}

export async function generateChromeIconAsync(
  { projectRoot, publicPath }: ProjectOptions,
  icon: IconOptions,
  { sizes = [144, 192, 512] }: { sizes?: number[] }
): Promise<HTMLOutput[]> {
  const cacheType = 'chrome-icon';

  const data = await Promise.all<HTMLOutput>(
    sizes.map(
      async (size: number): Promise<HTMLOutput> => {
        const rel = 'chrome-icon';
        const { source, name } = await Image.generateImageAsync(
          { projectRoot, cacheType },
          { ...icon, width: size, height: size, name: `${rel}-${size}.png` }
        );

        const href = `pwa/${rel}/${name}`;

        return {
          asset: {
            source,
            path: href,
          },
          manifest: {
            src: joinUrlPath(publicPath, href),
            sizes: `${size}x${size}`,
            type: 'image/png',
          },
        };
      }
    )
  );

  // Don't clear the caches if no generation was performed.
  if (!sizes.length) {
    await Image.Cache.clearUnusedCachesAsync(projectRoot, cacheType);
  }

  return data;
}

export async function generateFaviconAsync(
  { projectRoot, publicPath }: ProjectOptions,
  icon: IconOptions
): Promise<HTMLOutput[]> {
  const cacheType = 'favicon';
  const dimensions = [16, 32, 48];
  const data: HTMLOutput[] = await Promise.all<HTMLOutput>(
    dimensions.map(
      async (size: number): Promise<HTMLOutput> => {
        const rel = 'icon';
        const { source, name } = await Image.generateImageAsync(
          { projectRoot, cacheType },
          {
            ...icon,
            backgroundColor: icon.backgroundColor || 'transparent',
            width: size,
            height: size,
            name: `favicon-${size}.png`,
          }
        );

        const href = `${name}`;

        return {
          asset: {
            source,
            path: href,
          },
          tag: {
            tagName: 'link',
            attributes: {
              rel,
              type: 'image/png',
              sizes: `${size}x${size}`,
              href: joinUrlPath(publicPath, href),
            },
          },
        };
      }
    )
  );

  const faviconUrl = joinUrlPath(publicPath, 'favicon.ico');

  const largestImageBuffer = data[data.length - 1].asset.source;

  const faviconBuffer = await Image.generateFaviconAsync(largestImageBuffer, dimensions);

  await Image.Cache.clearUnusedCachesAsync(projectRoot, cacheType);

  return [
    data[0],
    data[1],
    {
      asset: { source: faviconBuffer, path: 'favicon.ico' },
      tag: {
        tagName: 'link',
        attributes: { rel: 'shortcut icon', href: faviconUrl },
      },
    },
  ];
}

export async function generateManifestAsync(
  options: ProjectOptions,
  configPath?: string,
  config?: ExpoConfig
): Promise<HTMLOutput[]> {
  if (configPath) {
    setCustomConfigPath(options.projectRoot, configPath);
  }
  const manifest = generateManifestJson(options, config);
  return [
    {
      // TODO: Bacon: Make the types more flexible
      asset: { source: JSON.stringify(manifest, null, 2) as any, path: 'manifest.json' },
      tag: {
        tagName: 'link',
        attributes: { rel: 'manifest', href: joinUrlPath(options.publicPath, 'manifest.json') },
      },
    },
  ];
}

export function generateManifestJson(
  { projectRoot }: Partial<ProjectOptions>,
  config?: ExpoConfig
): Manifest {
  if (!config) {
    if (!projectRoot) throw new Error('You must either define projectRoot or config');
    config = getConfigForPWA(projectRoot);
  }
  return createPWAManifestFromWebConfig(config.web);
}

export { getConfigForPWA };
export {
  getSafariStartupImageConfig,
  getSafariIconConfig,
  getFaviconIconConfig,
  getChromeIconConfig,
} from './Manifest';

export { IconOptions, ProjectOptions, HTMLOutput, PWAConfig } from './Manifest.types';
