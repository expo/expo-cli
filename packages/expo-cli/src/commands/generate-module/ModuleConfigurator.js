import fse from 'fs-extra';
import path from 'path';
import walkSync from 'klaw-sync';
import targz from 'targz';

/**
 * Renames files names
 * @param {path} directoryPath - directory that holds files to be renamed
 * @param {string[]} extensions - array of extensions for files that would be renamed, must be provided with leading dot or empty for no extension, e.g. ['.html', '']
 * @param {{ from: string, to: stirng }[]} renamings - array of files names and their replacers
 */
const renameFilesWithExtensions = (directoryPath, extensions, renamings) => {
  renamings.forEach(({ from, to }) =>
    extensions.forEach(extension => {
      const fromFilename = `${from}${extension}`;
      if (!fse.existsSync(path.join(directoryPath, fromFilename))) {
        return;
      }
      const toFilename = `${to}${extension}`;
      fse.renameSync(path.join(directoryPath, fromFilename), path.join(directoryPath, toFilename));
    })
  );
};

/**
 * Enters each file recursively in provided dir and replaces content by invoking provided callback function
 * @param {path} directoryPath - root directory
 * @param {(contentOfSingleFile: string) => string} replaceFunction - function that converts current content into something different
 */
const replaceContents = (directoryPath, replaceFunction) => {
  for (let file of walkSync(directoryPath, { nodir: true })) {
    replaceContent(file.path, replaceFunction);
  }
};

/**
 * Replaces content in file
 * @param {path} filePath - provided file
 * @param {(contentOfSingleFile: string) => string} replaceFunction - function that converts current content into something different
 */
const replaceContent = (filePath, replaceFunction) => {
  const content = fse.readFileSync(filePath, 'utf8');
  const newContent = replaceFunction(content);
  if (newContent !== content) {
    fse.writeFileSync(filePath, newContent);
  }
};

/**
 * Removes all empty subsdirs up to rootDir
 * Recursively enters all subdirs and removes them if one is empty or cantained only empty subdirs
 * @param {path} dirPath - directory path that is being inspected
 * @returns {boolean} whether directory was deleted or not
 */
const removeUponEmptyOrOnlyEmptySubdirs = dirPath => {
  const contents = fse.readdirSync(dirPath);
  const results = contents.map(file => {
    const filePath = path.join(dirPath, file);
    const fileStats = fse.lstatSync(filePath);
    return fileStats.isDirectory() && removeUponEmptyOrOnlyEmptySubdirs(filePath);
  });
  const isRemovable = results.reduce((acc, current) => acc && current, true);
  if (isRemovable) {
    fse.removeSync(dirPath);
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
export async function configureIOS(modulePath, { podName, jsModuleName }) {
  const iosPath = path.join(modulePath, 'ios');
  renameFilesWithExtensions(
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
  renameFilesWithExtensions(
    iosPath,
    ['', '.podspec'],
    [{ from: 'EXModuleTemplate', to: `${podName}` }]
  );
  replaceContents(iosPath, singleFileContent =>
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
export async function configureAndroid(modulePath, { javaPackage, jsModuleName }) {
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
  fse.mkdirpSync(destinationFilesPath);
  fse.copySync(sourceFilesPath, destinationFilesPath);

  // Remove leaf directory content
  fse.removeSync(sourceFilesPath);
  // Cleunp all empty subdirs up to provided rootDir
  removeUponEmptyOrOnlyEmptySubdirs(path.join(androidPath, 'src', 'main', 'java', 'expo'));

  const moduleName = jsModuleName.startsWith('Expo') ? jsModuleName.substring(4) : jsModuleName;
  replaceContents(androidPath, singleFileContent =>
    singleFileContent
      .replace(/expo\.module\.template/g, javaPackage)
      .replace(/ModuleTemplate/g, moduleName)
      .replace(/ExpoModuleTemplate/g, jsModuleName)
  );
  replaceContent(path.join(androidPath, 'build.gradle'), gradleContent =>
    gradleContent
      .replace(/version = ['"][\w.-]+['"]/, "version = '1.0.0'")
      .replace(/versionCode \d+/, 'versionCode 1')
      .replace(/versionName ['"][\w.-]+['"]/, "versionName '1.0.0'")
  );
  renameFilesWithExtensions(
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
export async function configureTS(modulePath, { npmModuleName, podName, jsModuleName }) {
  replaceContent(path.join(modulePath, 'package.json'), singleFileContent =>
    singleFileContent
      .replace(/expo-module-template/g, npmModuleName)
      .replace(/"version": "[\w.-]+"/, '"version": "1.0.0"')
      .replace(/ExpoModuleTemplate/g, jsModuleName)
  );
  replaceContent(path.join(modulePath, 'README.md'), readmeContent =>
    readmeContent
      .replace(/expo-module-template/g, npmModuleName)
      .replace(/ExpoModuleTemplate/g, jsModuleName)
      .replace(/EXModuleTemplate/g, podName)
  );
  replaceContents(path.join(modulePath, 'src'), singleFileContent =>
    singleFileContent.replace(/ExpoModuleTemplate/g, jsModuleName)
  );
  renameFilesWithExtensions(
    path.join(modulePath, 'src'),
    ['.tsx'],
    [{ from: 'ExpoModuleTemplateView', to: `${jsModuleName}View` }]
  );
}
