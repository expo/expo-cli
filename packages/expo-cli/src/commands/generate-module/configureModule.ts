import fse from 'fs-extra';
import path from 'path';
import walkSync from 'klaw-sync';

export type ModuleConfigration = { npmModuleName: string; podName: string; javaPackage: string; jsModuleName: string; };

const asyncForEach = async <T>(array: T[], callback: (element: T, index: number, arr: T[]) => Promise<void>) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

/**
 * Renames files names
 * @param {path} directoryPath - directory that holds files to be renamed
 * @param {string[]} extensions - array of extensions for files that would be renamed, must be provided with leading dot or empty for no extension, e.g. ['.html', '']
 * @param {{ from: string, to: string }[]} renamings - array of filenames and their replacers
 */
const renameFilesWithExtensions = async (directoryPath: string, extensions: string[], renamings: { from: string, to: string }[]) => {
  await asyncForEach(
    renamings,
    async ({ from, to }) =>
      await asyncForEach(extensions, async extension => {
        const fromFilename = `${from}${extension}`;
        if (!(await fse.pathExists(path.join(directoryPath, fromFilename)))) {
          return;
        }
        const toFilename = `${to}${extension}`;
        await fse.rename(
          path.join(directoryPath, fromFilename),
          path.join(directoryPath, toFilename)
        );
      })
  );
};

/**
 * Enters each file recursively in provided dir and replaces content by invoking provided callback function
 * @param {path} directoryPath - root directory
 * @param {(contentOfSingleFile: string) => string} replaceFunction - function that converts current content into something different
 */
const replaceContents = (
  directoryPath: string, 
  replaceFunction: (contentOfSingleFile: string) => string,
) => {
  for (let file of walkSync(directoryPath, { nodir: true })) {
    replaceContent(file.path, replaceFunction);
  }
};

/**
 * Replaces content in file
 * @param {path} filePath - provided file
 * @param {(contentOfSingleFile: string) => string} replaceFunction - function that converts current content into something different
 */
const replaceContent = async (
  filePath: string, 
  replaceFunction: (contentOfSingleFile: string) => string,
) => {
  const content = await fse.readFile(filePath, 'utf8');
  const newContent = replaceFunction(content);
  if (newContent !== content) {
    await fse.writeFile(filePath, newContent);
  }
};

/**
 * Removes all empty subsdirs up to rootDir
 * Recursively enters all subdirs and removes them if one is empty or cantained only empty subdirs
 * @param {path} dirPath - directory path that is being inspected
 * @returns {boolean} whether directory was deleted or not
 */
const removeUponEmptyOrOnlyEmptySubdirs = async (dirPath: string) => {
  const contents = await fse.readdir(dirPath);
  const results: boolean[] = await Promise.all(
    contents.map(async file => {
      const filePath = path.join(dirPath, file);
      const fileStats = await fse.lstat(filePath);
      return fileStats.isDirectory() && (await removeUponEmptyOrOnlyEmptySubdirs(filePath));
    })
  );
  const isRemovable = results.reduce((acc: boolean, current: boolean) => acc && current, true);
  if (isRemovable) {
    await fse.remove(dirPath);
  }
  return isRemovable;
};

/**
 * Prepares iOS part, mainly by renaming all files and some template word in files
 * Versioning is done automatically based on package.json from JS/TS part
 * @param {path} modulePath - module directory
 * @param {string} podName - PodName
 * @param {{ npmModuleName: string, podName: string, javaPackage: string, jsModuleName: string }} configuration - naming configuration
 */
async function configureIOS(modulePath: string, { podName, jsModuleName }: ModuleConfigration) {
  const iosPath = path.join(modulePath, 'ios');
  await renameFilesWithExtensions(
    path.join(iosPath, 'EXModuleTemplate'),
    ['.h', '.m'],
    [
      { from: 'EXModuleTemplateModule', to: `${podName}Module` },
      {
        from: 'EXModuleTemplateView',
        to: `${podName}View`,
      },
      {
        from: 'EXModuleTemplateViewManager',
        to: `${podName}ViewManager`,
      },
    ]
  );
  await renameFilesWithExtensions(
    iosPath,
    ['', '.podspec'],
    [{ from: 'EXModuleTemplate', to: `${podName}` }]
  );
  await replaceContents(iosPath, singleFileContent =>
    singleFileContent
      .replace(/EXModuleTemplate/g, podName)
      .replace(/ExpoModuleTemplate/g, jsModuleName)
  );
}

/**
 * Prepares Android part, mainly by renaming all files and template words in files
 * Sets all version in gradle to 1.0.0
 * @param {path} modulePath - module directory
 * @param {{ npmModuleName: string, podName: string, javaPackage: string, jsModuleName: string }} configuration - naming configuration
 */
async function configureAndroid(modulePath: string, { javaPackage, jsModuleName }: ModuleConfigration) {
  const androidPath = path.join(modulePath, 'android');
  const sourceFilesPath = path.join(
    androidPath,
    'src',
    'main',
    'java',
    'expo',
    'module',
    'template'
  );
  const destinationFilesPath = path.join(
    androidPath,
    'src',
    'main',
    'java',
    ...javaPackage.split('.')
  );
  await fse.mkdirp(destinationFilesPath);
  await fse.copy(sourceFilesPath, destinationFilesPath);

  // Remove leaf directory content
  await fse.remove(sourceFilesPath);
  // Cleunp all empty subdirs up to provided rootDir
  await removeUponEmptyOrOnlyEmptySubdirs(path.join(androidPath, 'src', 'main', 'java', 'expo'));

  const moduleName = jsModuleName.startsWith('Expo') ? jsModuleName.substring(4) : jsModuleName;
  await replaceContents(androidPath, singleFileContent =>
    singleFileContent
      .replace(/expo\.module\.template/g, javaPackage)
      .replace(/ModuleTemplate/g, moduleName)
      .replace(/ExpoModuleTemplate/g, jsModuleName)
  );
  await replaceContent(path.join(androidPath, 'build.gradle'), gradleContent =>
    gradleContent
      .replace(/version = ['"][\w.-]+['"]/, "version = '1.0.0'")
      .replace(/versionCode \d+/, 'versionCode 1')
      .replace(/versionName ['"][\w.-]+['"]/, "versionName '1.0.0'")
  );
  await renameFilesWithExtensions(
    destinationFilesPath,
    ['.java'],
    [
      { from: 'ModuleTemplateModule', to: `${moduleName}Module` },
      { from: 'ModuleTemplatePackage', to: `${moduleName}Package` },
      { from: 'ModuleTemplateView', to: `${moduleName}View` },
      { from: 'ModuleTemplateViewManager', to: `${moduleName}ViewManager` },
    ]
  );
}

/**
 * Prepares JS/TS part with npm package with package.json and README.md
 * @param {string} modulePath - module directory
 * @param {{ npmModuleName: string, podName: string, javaPackage: string, jsModuleName: string }} configuration - naming configuration
 */
async function configureTS(modulePath: string, { npmModuleName, podName, jsModuleName }: ModuleConfigration) {
  await replaceContent(path.join(modulePath, 'package.json'), singleFileContent =>
    singleFileContent
      .replace(/expo-module-template/g, npmModuleName)
      .replace(/"version": "[\w.-]+"/, '"version": "1.0.0"')
      .replace(/ExpoModuleTemplate/g, jsModuleName)
  );
  await replaceContent(path.join(modulePath, 'README.md'), readmeContent =>
    readmeContent
      .replace(/expo-module-template/g, npmModuleName)
      .replace(/ExpoModuleTemplate/g, jsModuleName)
      .replace(/EXModuleTemplate/g, podName)
  );
  await replaceContents(path.join(modulePath, 'src'), singleFileContent =>
    singleFileContent.replace(/ExpoModuleTemplate/g, jsModuleName)
  );
  await renameFilesWithExtensions(
    path.join(modulePath, 'src'),
    ['.tsx'],
    [{ from: 'ExpoModuleTemplateView', to: `${jsModuleName}View` }]
  );
}

/**
 * Configures TS, Android and iOS parts of generated module mostly by applying provided renamings
 * @param {string} modulePath - module directory
 * @param {{ npmModuleName: string, podName: string, javaPackage: string, jsModuleName: string }} configuration - naming configuration
 */
export default async function configureModule(newModulePath: string, configuration: ModuleConfigration) {
  await configureTS(newModulePath, configuration);
  await configureAndroid(newModulePath, configuration);
  await configureIOS(newModulePath, configuration);
}
