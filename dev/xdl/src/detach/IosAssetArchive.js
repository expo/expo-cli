
import mkdirp from 'mkdirp';
import path from 'path';

import {
  spawnAsyncThrowError,
} from './ExponentTools';

import * as IosIcons from './IosIcons';

/**
 *  Compile a .car file from the icons in a manifest.
 */
async function buildAssetArchiveAsync(
  manifest,
  destinationCARPath,
  expoSourceRoot,
  intermediatesDirectory
) {
  mkdirp.sync(intermediatesDirectory);

  // copy expoSourceRoot/.../Images.xcassets into intermediates
  await spawnAsyncThrowError(
    '/bin/cp',
    [
      '-R',
      path.join(expoSourceRoot, 'Exponent', 'Images.xcassets'),
      path.join(intermediatesDirectory, 'Images.xcassets'),
    ],
    {
      stdio: 'inherit',
    }
  );

  // make the new xcassets contain the project's icon
  await IosIcons.createAndWriteIconsToPathAsync(
    manifest,
    path.join(intermediatesDirectory, 'Images.xcassets', 'AppIcon.appiconset')
  );

  // compile asset archive
  let xcrunargs = [].concat(
    ['actool'],
    ['--minimum-deployment-target', '9.0'],
    ['--platform', 'iphoneos'],
    ['--app-icon', 'AppIcon'],
    [
      '--output-partial-info-plist',
      path.join(intermediatesDirectory, 'assetcatalog_generated_info.plist'),
    ],
    ['--compress-pngs'],
    ['--enable-on-demand-resources', 'YES'],
    ['--product-type', 'com.apple.product-type.application'],
    ['--target-device', 'iphone'],
    ['--target-device', 'ipad'],
    ['--compile', path.relative(intermediatesDirectory, destinationCARPath)],
    ['Images.xcassets']
  );
  await spawnAsyncThrowError('xcrun', xcrunargs, {
    stdio: ['ignore', 'ignore', 'inherit'], // only stderr
    cwd: intermediatesDirectory,
  });

  return;
}

export {
  buildAssetArchiveAsync,
};
