import fs from 'fs-extra';
import { PNG } from 'pngjs';
import { XDLError, ErrorCode } from 'xdl';

export async function ensurePNGIsNotTransparent(imagePath) {
  let hasAlreadyResolved = false;
  return new Promise((res, rej) => {
    fs.createReadStream(imagePath)
      .pipe(new PNG({ filterType: 4 }))
      .on('metadata', ({ colorType }) => {
        if (colorType !== 6) {
          hasAlreadyResolved = true;
          res();
        }
      })
      .on('parsed', function() {
        if (hasAlreadyResolved) {
          return;
        }
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            let idx = (this.width * y + x) << 2;

            if (this.data[idx + 3] !== 255) {
              const err = new XDLError(
                ErrorCode.INVALID_ASSETS,
                `Your application icon (${imagePath}) can't have transparency if you wish to upload your app to Apple Store.`
              );
              return rej(err);
            }
          }
        }
        res();
      })
      .on('error', err => rej(err));
  });
}
