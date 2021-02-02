import { UrlUtils, XDLError } from '@expo/xdl';
import axios from 'axios';
import fs from 'fs-extra';
import pick from 'lodash/pick';
import { PNG } from 'pngjs';
import { Readable } from 'stream';

async function getImageStreamAsync(imagePathOrURL: string) {
  const isUrl = UrlUtils.isURL(imagePathOrURL, {
    protocols: ['http', 'https'],
    requireProtocol: true,
  });

  if (isUrl) {
    const response = await axios.get<Readable>(imagePathOrURL, { responseType: 'stream' });
    return response.data;
  } else {
    return fs.createReadStream(imagePathOrURL);
  }
}

export async function ensurePNGIsNotTransparent(imagePathOrURL: string): Promise<void> {
  let hasAlreadyResolved = false;
  const stream = await getImageStreamAsync(imagePathOrURL);

  return new Promise((res, rej) => {
    stream
      .pipe(new PNG({ filterType: 4 }))
      .on('metadata', ({ alpha }) => {
        if (!alpha) {
          hasAlreadyResolved = true;
          if ('close' in stream) stream.close();
          res();
        }
      })
      .on('parsed', function () {
        if (hasAlreadyResolved) {
          return;
        }
        try {
          // @ts-ignore: 'this' implicitly has type 'any' because it does not have a type annotation.
          validateAlphaChannelIsEmpty(this.data, pick(this, ['width', 'height']));
          res();
        } catch (err) {
          rej(err);
        }
      })
      .on('error', err => rej(err));
  });
}

function validateAlphaChannelIsEmpty(
  data: Buffer,
  { width, height }: { width: number; height: number }
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4;
      if (data[idx + 3] !== 255) {
        throw new XDLError(
          'INVALID_ASSETS',
          `Your app icon can't have transparency if you wish to upload your app Apple's App Store. Read more here: https://expo.fyi/remove-alpha-channel`
        );
      }
    }
  }
}
