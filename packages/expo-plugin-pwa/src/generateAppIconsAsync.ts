import path from 'path';

import { resizeIconAsync } from './fav/resize';
import generateMeta from './generate-html';

async function genIconsAsync(src: string, dest: string, sizes: any[]): Promise<any[]> {
  return Promise.all(
    sizes.map(async ({ name, size, padding, color, resizeMode }: any) => {
      return {
        name,
        size,
        padding,
        src: (await resizeIconAsync(
          src,
          size,
          path.join(dest, name + '.png'),
          padding,
          color,
          resizeMode
        )) as string,
      };
    })
  );
}

export async function generateAndroidAppIconsAsync(
  src: string,
  dest: string,
  publicPath: string,
  color: string,
  resizeMode: string
): Promise<{ meta: string[]; manifest: { [key: string]: any } }> {
  const androidIcons = [
    { name: 'android-chrome-144x144', size: 144, color, resizeMode },
    { name: 'android-chrome-192x192', size: 192, color, resizeMode },
    { name: 'android-chrome-512x512', size: 512, color, resizeMode },
  ];
  const sizes = androidIcons;

  await genIconsAsync(src, dest, sizes);
  return {
    meta: [generateMeta.manifest({ href: 'manifest.json' })],
    manifest: {
      icons: androidIcons.map(icon => ({
        type: 'image/png',
        sizes: `${icon.size}x${icon.size}`,
        src: path.join(publicPath, `/${icon.name}.png`),
      })),
    },
  };
}

// TODO: Create MS manifest
export async function generateWindowsAppIconsAsync(
  src: string,
  dest: string,
  publicPath: string,
  // TODO: use the color in the manifest
  color: string,
  resizeMode: string
): Promise<{ meta: string[]; manifest: { [key: string]: any } }> {
  const sizes = [{ name: 'mstile-150x150', size: 270, padding: 72, color, resizeMode }];

  await genIconsAsync(src, dest, sizes);
  return {
    meta: [],
    manifest: {},
  };
}

export async function generateIosAppIconsAsync(
  src: string,
  dest: string,
  publicPath: string,
  color: string,
  resizeMode: string
): Promise<{ meta: string[]; manifest: { [key: string]: any } }> {
  const sizes = [{ name: 'apple-touch-icon', size: 180, color, resizeMode }];

  await genIconsAsync(src, dest, sizes);
  return {
    meta: [
      generateMeta.appleTouchIcon({
        size: sizes[0].size,
        href: path.join(publicPath, sizes[0].name + '.png'),
      }),
    ],
    manifest: {},
  };
}
