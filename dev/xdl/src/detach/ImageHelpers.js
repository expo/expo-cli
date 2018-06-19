import fs from 'fs-extra';
import path from 'path';
import detectInstalled from 'detect-installed';

let _sharp;

export async function resizeIconWithSharpAsync(iconSizePx, iconFilename, destinationIconPath) {
  const sharp = await maybeLoadSharp();
  const filename = path.join(destinationIconPath, iconFilename);

  // sharp can't have same input and output filename, so load to buffer then
  // write to disk after resize is complete
  const buffer = await sharp(filename)
    .resize(iconSizePx, iconSizePx)
    .toBuffer();

  await fs.writeFile(filename, buffer);
}

export async function getImageDimensionsWithSharpAsync(basename, dirname) {
  const sharp = await maybeLoadSharp();
  const filename = path.join(dirname, basename);

  try {
    const meta = await sharp(filename).metadata();
    return [meta.width, meta.height];
  } catch (e) {
    return null;
  }
}

async function maybeLoadSharp() {
  if (_sharp) {
    return _sharp;
  }

  const installed = await detectInstalled('sharp', { local: true });
  if (installed) {
    _sharp = require('sharp');
    return _sharp;
  } else {
    throw new Error('`sharp` package not installed');
  }
}
