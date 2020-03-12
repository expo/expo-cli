import * as path from 'path';
// @ts-ignore
import generateICO from 'to-ico';
import * as Image from './Image';
import * as Cache from './Cache';
import { assembleOrientationMedia, getDevices } from './splash';

type WebpackAsset = {
  source: Buffer;
  path: string;
};

type HtmlTag = {
  tagName: 'link';
  voidTag: boolean;
  attributes: { rel?: string; href?: string; media?: string; sizes?: string; type?: string };
};

type SplashIcon = Image.Icon & {
  media: string;
};

type ProjectOptions = {
  projectRoot: string;
  publicPath: string;
};

export async function generateSplashAsync(
  { projectRoot, publicPath }: ProjectOptions,
  icon: Omit<Image.Icon, 'width' | 'height'> | any[]
): Promise<{ asset: WebpackAsset; tag: HtmlTag }[]> {
  const cacheType = 'apple-touch-startup-image';

  // You cannot lock iOS PWA orientation, we should produce every splash screen.
  // orientation
  const devices = getDevices({ orientation: 'any', supportsTablet: false });

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

  const data: { asset: WebpackAsset; tag: HtmlTag }[] = await Promise.all<{
    asset: WebpackAsset;
    tag: HtmlTag;
  }>(
    icons.map(
      async (icon: SplashIcon): Promise<any> => {
        const { source, name } = await Image.generateImageAsync({ projectRoot, cacheType }, icon);

        const href = `pwa/apple-touch-startup-image/${name}`;

        return {
          asset: {
            source,
            path: href,
          },
          tag: {
            tagName: 'link',
            voidTag: false,
            attributes: {
              rel: 'apple-touch-startup-image',
              media: icon.media,
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
  icon: Omit<Image.Icon, 'width' | 'height'>
): Promise<{ asset: WebpackAsset; tag: HtmlTag }[]> {
  const cacheType = 'apple-touch-icon';

  const data: { asset: WebpackAsset; tag: HtmlTag }[] = await Promise.all<{
    asset: WebpackAsset;
    tag: HtmlTag;
  }>(
    [180].map(
      async (size: number): Promise<any> => {
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
            voidTag: false,
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

  await Cache.clearUnusedCachesAsync(projectRoot, cacheType);

  return data;
}

export async function generateChromeIconAsync(
  { projectRoot, publicPath }: ProjectOptions,
  icon: Omit<Image.Icon, 'width' | 'height'>
): Promise<{ asset: WebpackAsset; manifest: { src: string; sizes: string; type: 'image/png' } }[]> {
  const cacheType = 'chrome-icon';

  const data = await Promise.all<{
    asset: WebpackAsset;
    manifest: { src: string; sizes: string; type: 'image/png' };
  }>(
    [144, 192, 512].map(
      async (size: number): Promise<any> => {
        const rel = 'chrome-icon';
        const { source, name } = await Image.generateImageAsync(
          { projectRoot, cacheType },
          { ...icon, width: size, height: size, name: `${rel}-${size}x${size}.png` }
        );
        console.log('gen img', name);

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

  await Cache.clearUnusedCachesAsync(projectRoot, cacheType);

  return data;
}

export async function generateFaviconAsync(
  { projectRoot, publicPath }: ProjectOptions,
  icon: Omit<Image.Icon, 'width' | 'height'>
): Promise<{ asset: WebpackAsset; tag: HtmlTag }[]> {
  const cacheType = 'favicon';

  //   favicon: ({ href }: any) => `<link rel="shortcut icon" href="${href}">`,
  //   faviconPng: ({ href, size }: any) =>
  //     `<link rel="icon" type="image/png" sizes="${size}x${size}" href="${href}">`,

  const data: { asset: WebpackAsset; tag: HtmlTag }[] = await Promise.all<{
    asset: WebpackAsset;
    tag: HtmlTag;
  }>(
    [16, 32, 48].map(
      async (size: number): Promise<any> => {
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
            voidTag: false,
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
        voidTag: false,
        attributes: { rel: 'shortcut icon', href: faviconUrl },
      },
    },
  ];
}
