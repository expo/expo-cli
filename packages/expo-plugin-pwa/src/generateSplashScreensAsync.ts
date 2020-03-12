import fs from 'fs-extra';
import path from 'path';

import resizeAsync from './fav/resize';
import { fromStartupImage } from './splash';

export async function generateSplashScreensAsync(
  src: string,
  destination: string,
  publicPath: string,
  color: string,
  resizeMode: string,
  padding: number = 0
): Promise<string[]> {
  await fs.ensureDir(destination);

  const images = fromStartupImage({
    src,
    padding,
    resizeMode: resizeMode as any,
    destination,
    color,
  });
  const meta = await Promise.all(
    images.map(async img => {
      return {
        name: img.name,
        rel: 'apple-touch-startup-image',
        media: img.media,
        href: img.name,
        //   size,

        src: (await resizeAsync(
          src,
          'image/png',
          img.size.width,
          img.size.height,
          img.resizeMode,
          img.color || 'white',
          img.padding,
          img.destination
        )) as string,
      };
    })
  );
  return meta.map(meta => {
    return `<link rel="${meta.rel}" href="${path.join(publicPath, meta.href)}" media="${
      meta.media
    }"></link>`;
  });
}
