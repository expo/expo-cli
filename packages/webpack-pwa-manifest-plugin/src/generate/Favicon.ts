import fs from 'fs-extra';
import path from 'path';
// @ts-ignore
import generateICO from 'to-ico';
import { fileExistsAsync } from '@expo/config';
import { resizeIconAsync } from './resize';
import generateMeta from './HTML';
import { downloadImage } from '../icons';

export async function generate(
  src: string,
  publicPath: string
): Promise<{ html: string[]; files: any[] }> {
  if (src.startsWith('http')) {
    src = await downloadImage(src);
  }

  if (!(await fileExistsAsync(src))) return { files: [], html: [] };

  const files: { output: string; size: number; source: Buffer }[] = [];
  const sizes = [16, 32, 48];
  const imgs = await Promise.all(
    sizes.map(async size => {
      const buffPath = (await resizeIconAsync(src, size)) as string;
      const buff = await fs.readFile(buffPath);
      return {
        output: `favicon-${size}x${size}.png`,
        width: size,
        size: buff.length,
        sourcePath: buffPath,
        source: buff,
      };
    })
  );

  const names = sizes.map(size => `favicon-${size}x${size}.png`);

  const faviconUrl = path.join(publicPath, 'favicon.ico');
  const imageBuffer = await generateICO(imgs.map(({ source }) => source)[imgs.length - 1], {
    resize: true,
  });
  files.push(
    {
      size: imageBuffer.length,
      output: faviconUrl,
      source: imageBuffer,
    },
    imgs[0],
    imgs[1]
  );

  return {
    files,
    html: [
      generateMeta.favicon.ico({ href: faviconUrl }),
      // I don't think 48x48 is required, it just needs to be in the favicon.ico
      generateMeta.favicon.png({ size: 16, href: path.join(publicPath, names[0]) }),
      generateMeta.favicon.png({ size: 32, href: path.join(publicPath, names[1]) }),
    ],
  };
}
