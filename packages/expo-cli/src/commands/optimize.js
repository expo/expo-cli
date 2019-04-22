import glob from 'glob';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { ProjectUtils, ProjectSettings } from 'xdl';
import JsonFile from '@expo/json-file';
import log from '../log';

async function action(projectDir = './', options) {
  log('Optimizing assets...');
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  if (exp === null) {
    log.warn('No Expo configuration found. Are you sure this is a project directory?');
    process.exit(1);
  }

  const [assetJson, assetInfo] = await readAssetJsonAsync(projectDir);

  // Filter out image assets
  const files = getAssetFiles(exp);
  const regex = /\.(png|jpg|jpeg)$/;
  const images = files.filter(file => regex.test(file.toLowerCase()));
  for (const image of images) {
    const buffer = await sharp(image).toBuffer();
    const metadata = await sharp(buffer).metadata();
    const newName = createOutputFilename(image);

    const { mTimeMS: lastModified, ino: inode } = fs.statSync(image);
    if (!assetInfo[inode] || assetInfo[inode] < lastModified) {
      // Store as inode: timeCompressed
      assetInfo[inode] = Date.now();
      assetJson.writeAsync(assetInfo);

      if (metadata.format === 'jpeg') {
        sharp(image)
          .jpeg({ quality: 75 })
          .toFile(newName);
      } else {
        const outputFile = await sharp(image)
          .png({ quality: 75 })
          .toFile(newName);
      }
    }
  }
}

/*
 * Find all assets under assetBundlePatterns in app.json
 */
const getAssetFiles = exp => {
  const { assetBundlePatterns } = exp;
  const files = [];
  assetBundlePatterns.forEach(pattern => {
    files.push(...glob.sync(pattern, { ignore: '**/node_modules/**' }));
  });
  return files;
};

/*
 * Read the contents of assets.json under .expo folder. Create the file if it doesn't exist.
 */
const readAssetJsonAsync = async projectDir => {
  const { dotExpoProjectDirectory } = ProjectSettings;
  const assetJson = new JsonFile(path.join(dotExpoProjectDirectory(projectDir), 'assets.json'));
  if (!fs.existsSync(assetJson.file)) {
    await assetJson.writeAsync({});
  }
  const assetInfo = await assetJson.readAsync();
  return [assetJson, assetInfo];
};

const createOutputFilename = image => {
  const path = image.split('/');
  const filename = path.pop();
  const [base, extension] = filename.split('.');
  const output = base + '-output.' + extension;
  return path.join('/') + '/' + output;
};

export default program => {
  program
    .command('optimize [project-dir]')
    .alias('o')
    .description('Compresses the assets in your expo project')
    .allowOffline()
    .asyncAction(action);
};
