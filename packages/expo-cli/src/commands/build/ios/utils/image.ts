import { Readable } from 'stream';

import fs from 'fs-extra';
import { PNG } from 'pngjs';
import pick from 'lodash/pick';
import { XDLError } from '@expo/xdl';
import axios from 'axios';
import validator from 'validator';

async function getImageStreamAsync(imagePathOrURL: string) {
  const isUrl = validator.isURL(imagePathOrURL, {
    protocols: ['http', 'https'],
    require_protocol: true,
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
      let idx = (width * y + x) * 4;
      if (data[idx + 3] !== 255) {
        throw new XDLError(
          'INVALID_ASSETS',
          `Your application icon can't have transparency if you wish to upload your app to Apple Store.`
        );
      }
    }
  }
}
