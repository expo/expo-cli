import fs from 'fs-extra';
import { join } from 'path';

export type ContentsJsonImageIdiom = 'iphone' | 'ipad' | 'ios-marketing' | 'universal';

type ImageAppearance = {
  appearance: 'luminosity';
  value: 'dark';
};

type ImageScale = '1x' | '2x' | '3x';

export interface ContentsJsonImage {
  appearances?: ImageAppearance[];
  idiom: ContentsJsonImageIdiom;
  size?: string;
  scale: ImageScale;
  filename?: string;
}

export interface ContentsJson {
  images: ContentsJsonImage[];
  info: {
    version: number;
    author: string;
  };
}

/**
 * Writes the Config.json which is used to assign images to their respective platform, dpi, and idiom.
 *
 * @param directory path to add the Contents.json to.
 * @param contents image json data
 */
export async function writeContentsJsonAsync(
  directory: string,
  { images }: Pick<ContentsJson, 'images'>
): Promise<void> {
  await fs.ensureDir(directory);

  await fs.writeFile(
    join(directory, 'Contents.json'),
    JSON.stringify(
      {
        images,
        info: {
          version: 1,
          // common practice is for the tool that generated the icons to be the "author"
          author: 'expo',
        },
      },
      null,
      2
    )
  );
}
