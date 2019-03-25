import fs from 'fs-extra';
import { PNG } from 'pngjs';
import pick from 'lodash/pick';
import { XDLError, ErrorCode } from 'xdl';

async function ensurePNGIsNotTransparent(imagePath) {
  let hasAlreadyResolved = false;
  return new Promise((res, rej) => {
    const stream = fs.createReadStream(imagePath);
    stream
      .pipe(new PNG({ filterType: 4 }))
      .on('metadata', ({ colorType }) => {
        if (colorType !== 6) {
          hasAlreadyResolved = true;
          stream.close();
          res();
        }
      })
      .on('parsed', function() {
        if (hasAlreadyResolved) {
          return;
        }
        try {
          valideAlphaChannelIsEmpty(this.data, pick(this, ['width', 'height']));
        } catch (err) {
          return rej(err);
        }
        res();
      })
      .on('error', err => rej(err));
  });
}

function valideAlphaChannelIsEmpty(data, { width, height }) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let idx = (width * y + x) * 4;
      if (data[idx + 3] !== 255) {
        throw new XDLError(
          ErrorCode.INVALID_ASSETS,
          `Your application icon can't have transparency if you wish to upload your app to Apple Store.`
        );
      }
    }
  }
}

export { ensurePNGIsNotTransparent };
