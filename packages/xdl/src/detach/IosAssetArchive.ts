import fs from 'fs-extra';
import path from 'path';

import { parseSdkMajorVersion, spawnAsyncThrowError } from './ExponentTools';
import * as IosIcons from './IosIcons';
import { AnyStandaloneContext, StandaloneContextService } from './StandaloneContext';

/**
 *  Compile a .car file from the icons in a manifest.
 */
async function buildAssetArchiveAsync(
  context: AnyStandaloneContext,
  destinationCARPath: string,
  intermediatesDirectory: string
) {
  if (!(context instanceof StandaloneContextService)) {
    throw new Error('buildAssetArchive is only supported for service standalone contexts.');
  }
  const { data } = context;
  fs.mkdirpSync(intermediatesDirectory);

  // copy expoSourceRoot/.../Images.xcassets into intermediates
  await spawnAsyncThrowError(
    '/bin/cp',
    [
      '-R',
      path.join(data.expoSourcePath, 'Exponent', 'Images.xcassets'),
      path.join(intermediatesDirectory, 'Images.xcassets'),
    ],
    {
      stdio: 'inherit',
    }
  );

  // make the new xcassets contain the project's icon
  await IosIcons.createAndWriteIconsToPathAsync(
    context,
    path.join(intermediatesDirectory, 'Images.xcassets', 'AppIcon.appiconset')
  );

  const sdkMajorVersion = parseSdkMajorVersion(data.manifest.sdkVersion);
  const deploymentTarget = sdkMajorVersion > 30 ? '10.0' : '9.0'; // SDK31 drops support for iOS 9.0

  // compile asset archive
  // prettier-ignore
  const xcrunargs = [
    'actool',
    '--minimum-deployment-target', deploymentTarget,
    '--platform', 'iphoneos',
    '--app-icon', 'AppIcon',
    '--output-partial-info-plist', 'assetcatalog_generated_info.plist',
    '--compress-pngs',
    '--enable-on-demand-resources', 'YES',
    '--product-type', 'com.apple.product-type.application',
    '--target-device', 'iphone',
    '--target-device', 'ipad',
    '--compile', path.relative(intermediatesDirectory, destinationCARPath),
    'Images.xcassets',
  ]
  /*
   *  Note: if you want to debug issues with `actool`, try changing to stdio: 'inherit'.
   *  In both success and failure cases, actool will write an enormous .plist to stdout
   *  which may contain the key `com.apple.actool.errors`. Great work Apple
   */
  await spawnAsyncThrowError('xcrun', xcrunargs, {
    stdio: ['ignore', 'ignore', 'inherit'], // only stderr
    cwd: intermediatesDirectory,
  });
}

export { buildAssetArchiveAsync };
