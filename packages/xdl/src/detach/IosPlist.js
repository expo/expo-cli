import fs from 'fs-extra';
import path from 'path';
import plist from 'plist';

import { spawnAsyncThrowError } from './ExponentTools';

function _getNormalizedPlistFilename(plistName) {
  let plistFilename;
  if (plistName.indexOf('.') !== -1) {
    plistFilename = plistName;
  } else {
    plistFilename = `${plistName}.plist`;
  }
  return plistFilename;
}

function buildPlistFromObject(object) {
  // We start with an offset of -1, because Xcode maintains a custom indentation of the plist.
  // Ref: https://github.com/facebook/react-native/issues/11668
  return plist.build(object, { indent: '\t', offset: -1 }) + '\n';
}

/**
 *  @param plistName base filename of property list. if no extension, assumes .plist
 */
async function modifyAsync(plistPath, plistName, transform) {
  const plistFilename = _getNormalizedPlistFilename(plistName);
  const configPlistName = path.join(plistPath, plistFilename);

  // grab original plist as json object
  const config = plist.parse(fs.readFileSync(configPlistName, 'utf8'));

  // apply transformation
  const transformedConfig = transform(config);

  // build plist content from object
  const newPlistContent = buildPlistFromObject(transformedConfig);

  await fs.writeFile(configPlistName, newPlistContent);

  return config;
}

async function createBlankAsync(plistPath, plistName) {
  // write empty json file
  const emptyConfig = {};
  const tmpConfigFile = path.join(plistPath, `${plistName}.json`);
  await fs.writeFile(tmpConfigFile, JSON.stringify(emptyConfig));

  // convert to plist
  const plistFilename = _getNormalizedPlistFilename(plistName);
  const configPlistName = path.join(plistPath, plistFilename);

  await fs.writeFile(configPlistName, buildPlistFromObject(emptyConfig));

  // remove tmp json file
  await spawnAsyncThrowError('/bin/rm', [tmpConfigFile]);
}

async function cleanBackupAsync(plistPath, plistName, restoreOriginal = true) {
  let plistFilename = _getNormalizedPlistFilename(plistName);
  let configPlistName = path.join(plistPath, plistFilename);
  let configFilename = path.join(plistPath, `${plistName}.json`);
  const backupPlistPath = `${configPlistName}.bak`;

  if (restoreOriginal && (await fs.exists(backupPlistPath))) {
    await fs.copy(backupPlistPath, configPlistName);
  }

  await fs.remove(backupPlistPath);
  await fs.remove(configFilename);
}

export { modifyAsync, cleanBackupAsync, createBlankAsync };
