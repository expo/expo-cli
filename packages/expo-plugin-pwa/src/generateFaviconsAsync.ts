import fs from 'fs-extra';
import path from 'path';

import generateICO from './fav/ico';
import { resizeIconAsync } from './fav/resize';
import generateMeta from './generate-html';

export async function generateFaviconsAsync(
  src: string,
  dest: string,
  publicPath: string
): Promise<string[]> {
  const sizes = [16, 32, 48];
  const imgs = await Promise.all(
    sizes.map(async size => {
      return {
        size,
        src: (await resizeIconAsync(src, size)) as string,
      };
    })
  );

  const names = sizes.map(size => `favicon-${size}x${size}.png`);
  // I don't think 48x48 is required, it just needs to be in the favicon.ico
  await Promise.all(
    imgs.slice(0, -1).map(({ size, src }, index) => {
      return fs.copyFile(src, path.join(dest, names[index]));
    })
  );

  await generateICO(
    imgs.map(({ size, src }) => ({ size, filePath: src })),
    dest,
    {
      name: 'favicon',
      sizes,
    }
  );

  return [
    generateMeta.favicon({ href: path.join(publicPath, 'favicon.ico') }),
    generateMeta.faviconPng({ size: 16, href: path.join(publicPath, names[0]) }),
    generateMeta.faviconPng({ size: 32, href: path.join(publicPath, names[1]) }),
  ];
}
