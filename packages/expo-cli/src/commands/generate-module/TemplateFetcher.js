import path from 'path';
import fse from 'fs-extra';
import child_process from 'child_process';

const NPM_TEMPLATE_VERSION = '2.0.1';
const NPM_TEMPLATE = 'expo-module-template';

/**
 * Decompresses tarball archive obtained from npm
 * @param {path} archive - path to actual archive
 * @param {path} destinationDir - destination for uncompressed files
 */
const decompress = async (archive, destinationDir) => {
  return new Promise((resolve, reject) => {
    targz.decompress(
      {
        src: archive,
        dest: destinationDir,
      },
      error => {
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      }
    );
  });
};

/**
 * Copies files from local directory to another local directory
 * @param {path} sourceModuleDirPath
 * @param {path} destinationModuleDirPath
 */
const copyModuleTemplateDir = async (sourceModuleDirPath, destinationModuleDirPath) => {
  fse.copySync(sourceModuleDirPath, destinationModuleDirPath);
};

/**
 * Downloads template module `${NPM_TEMPLATE}@${NPM_TEMPLATE_VERSION}` from npm repository and unpacks it to given destination
 * @param {path} destinationModuleDirName
 */
const downloadModuleTempalteDir = async destinationModuleDirName => {
  const archive = child_process
    .execSync(`npm pack ${NPM_TEMPLATE}@${NPM_TEMPLATE_VERSION}`)
    .toString()
    .slice(0, -1);

  fse.mkdirpSync(destinationModuleDirName);
  await decompress(archive, destinationModuleDirName);
  fse.unlinkSync(archive);
};

/**
 * Fetches directory from npm or given templateDirectory into destinationPath
 * @param {string?} templateDirectory - optional templateDirectory
 * @param {path} destinationPath - destination for fetched template
 */
export async function fetchTemplate(templateDirectory, destinationPath) {
  if (templateDirectory) {
    await copyModuleTemplateDir(path.resolve(templateDirectory), destinationPath);
  } else {
    await downloadModuleTempalteDir(destinationPath);
  }
}
