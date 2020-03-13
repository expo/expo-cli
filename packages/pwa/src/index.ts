import { ExpoConfig } from '@expo/config';
import * as path from 'path';
// @ts-ignore
import generateICO from 'to-ico';

import * as Cache from './Cache';
import * as Image from './Image';
import { assembleOrientationMedia, getDevices } from './Splash';
import { createPWAManifestFromConfig, getConfigForPWA } from './Web';
import { HTMLOutput, IconOptions, Manifest, ProjectOptions, SplashIcon } from './Web.types';

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
    case 'manifest':
      return generateManifestAsync(options);
  }
  throw new Error('invalid type: ' + type);
}

export async function generateSplashAsync(
  { projectRoot, publicPath }: ProjectOptions,
  icon: IconOptions
): Promise<HTMLOutput[]> {
  const cacheType = 'apple-touch-startup-image';

  // You cannot lock iOS PWA orientation, we should produce every splash screen.
  // orientation
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
              href: path.join(publicPath, href),
            },
          },
        };
      }
    )
  );

  await Cache.clearUnusedCachesAsync(projectRoot, cacheType);

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
          { ...icon, width: size, height: size, name: `${rel}-${size}x${size}.png` }
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
              href: path.join(publicPath, href),
            },
          },
        };
      }
    )
  );

  // Don't clear the caches if no generation was performed.
  if (!sizes.length) {
    await Cache.clearUnusedCachesAsync(projectRoot, cacheType);
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
          { ...icon, width: size, height: size, name: `${rel}-${size}x${size}.png` }
        );

        const href = `pwa/${rel}/${name}`;

        return {
          asset: {
            source,
            path: href,
          },
          manifest: {
            src: path.join(publicPath, href),
            sizes: `${size}x${size}`,
            type: 'image/png',
          },
        };
      }
    )
  );

  // Don't clear the caches if no generation was performed.
  if (!sizes.length) {
    await Cache.clearUnusedCachesAsync(projectRoot, cacheType);
  }

  return data;
}

export async function generateFaviconAsync(
  { projectRoot, publicPath }: ProjectOptions,
  icon: IconOptions
): Promise<HTMLOutput[]> {
  const cacheType = 'favicon';
  const data: HTMLOutput[] = await Promise.all<HTMLOutput>(
    [16, 32, 48].map(
      async (size: number): Promise<HTMLOutput> => {
        const rel = 'icon';
        const { source, name } = await Image.generateImageAsync(
          { projectRoot, cacheType },
          {
            ...icon,
            backgroundColor: 'transparent',
            resizeMode: 'contain',
            width: size,
            height: size,
            name: `favicon-${size}x${size}.png`,
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
              href: path.join(publicPath, href),
            },
          },
        };
      }
    )
  );

  const faviconUrl = path.join(publicPath, 'favicon.ico');

  const imageBuffer = await generateICO(data.map(({ asset }) => asset.source)[data.length - 1], {
    resize: true,
  });

  await Cache.clearUnusedCachesAsync(projectRoot, cacheType);

  return [
    data[0],
    data[1],
    {
      asset: { source: imageBuffer, path: 'favicon.ico' },
      tag: {
        tagName: 'link',
        attributes: { rel: 'shortcut icon', href: faviconUrl },
      },
    },
  ];
}

export async function generateManifestAsync(
  options: ProjectOptions,
  config?: ExpoConfig
): Promise<HTMLOutput[]> {
  const manifest = generateManifestJson(options, config);
  return [
    {
      // TODO: Bacon: Make the types more flexible
      asset: { source: JSON.stringify(manifest) as any, path: 'manifest.json' },
      tag: {
        tagName: 'link',
        attributes: { rel: 'manifest', href: path.join(options.publicPath, 'manifest.json') },
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
  return createPWAManifestFromConfig(config);
}

export { getConfigForPWA };
export {
  getSafariStartupImageConfig,
  getSafariIconConfig,
  getFaviconIconConfig,
  getChromeIconConfig,
} from './Web';

export { IconOptions, Icon, ProjectOptions, HTMLOutput } from './Web.types';
