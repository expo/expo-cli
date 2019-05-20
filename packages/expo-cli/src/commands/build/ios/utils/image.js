import fs from 'fs-extra';
import { PNG } from 'pngjs';
import pick from 'lodash/pick';
import { XDLError, ErrorCode } from '@expo/xdl';
import request from 'request';
import validator from 'validator';

async function ensurePNGIsNotTransparent(imagePathOrURL) {
  let hasAlreadyResolved = false;
  const stream = validator.isURL(imagePathOrURL, {
    protocols: ['http', 'https'],
    require_protocol: true,
  })
    ? request(imagePathOrURL)
    : fs.createReadStream(imagePathOrURL);
  return new Promise((res, rej) => {
    stream
      .pipe(new PNG({ filterType: 4 }))
      .on('metadata', ({ alpha }) => {
        if (!alpha) {
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
          validateAlphaChannelIsEmpty(this.data, pick(this, ['width', 'height']));
          res();
        } catch (err) {
          rej(err);
        }
      })
      .on('error', err => rej(err));
  });
}

function validateAlphaChannelIsEmpty(data, { width, height }) {
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
