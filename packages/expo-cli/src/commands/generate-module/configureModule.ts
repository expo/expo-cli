import fse from 'fs-extra';
import path from 'path';
import walkSync from 'klaw-sync';
import { ModuleConfiguration } from './ModuleConfiguration';

const asyncForEach = async <T>(array: T[], callback: (value: T, index: number, array: T[]) => Promise<void>) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

async function removeFiles(directoryPath: string, filenames: string[]) {
  await asyncForEach(filenames, async filename => await fse.remove(path.resolve(directoryPath, filename)));
}

/**
 * Renames files names
 * @param directoryPath - directory that holds files to be renamed
 * @param extensions - array of extensions for files that would be renamed, must be provided with leading dot or empty for no extension, e.g. ['.html', '']
 * @param renamings - array of filenames and their replacers
 */
const renameFilesWithExtensions = async (directoryPath: string, extensions: string[], renamings: { from: string; to: string; }[]) => {
  await asyncForEach(
    renamings,
    async ({ from, to }) =>
      await asyncForEach(extensions, async extension => {
        const fromFilename = `${from}${extension}`;
        if (!(fse.existsSync(path.join(directoryPath, fromFilename)))) {
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
 * @param directoryPath - root directory
 * @param replaceFunction - function that converts current content into something different
 */
const replaceContents = async (directoryPath: string, replaceFunction: (contentOfSingleFile: string) => string) => {
  for (let file of walkSync(directoryPath, { nodir: true })) {
    replaceContent(file.path, replaceFunction);
  }
};

/**
 * Replaces content in file
 * @param filePath - provided file
 * @param replaceFunction - function that converts current content into something different
 */
const replaceContent = async (filePath: string, replaceFunction: (contentOfSingleFile: string) => string) => {
  const content = await fse.readFile(filePath, 'utf8');
  const newContent = replaceFunction(content);
  if (newContent !== content) {
    await fse.writeFile(filePath, newContent);
  }
};

/**
 * Removes all empty subdirs up to and including dirPath
 * Recursively enters all subdirs and removes them if one is empty or cantained only empty subdirs
 * @param dirPath - directory path that is being inspected
 * @returns whether the given base directory and any empty subdirectories were deleted or not
 */
const removeUponEmptyOrOnlyEmptySubdirs = async (dirPath: string): Promise<boolean> => {
  const contents = await fse.readdir(dirPath);
  const results = await Promise.all(
    contents.map(async file => {
      const filePath = path.join(dirPath, file);
      const fileStats = await fse.lstat(filePath);
      return fileStats.isDirectory() && (await removeUponEmptyOrOnlyEmptySubdirs(filePath));
    })
  );
  const isRemovable = results.reduce((acc, current) => acc && current, true);
  if (isRemovable) {
    await fse.remove(dirPath);
  }
  return isRemovable;
};

/**
 * Prepares iOS part, mainly by renaming all files and some template word in files
 * Versioning is done automatically based on package.json from JS/TS part
 * @param modulePath - module directory
 * @param configuration - naming configuration
 */
async function configureIOS(modulePath: string, { podName, jsModuleName, viewManager }: ModuleConfiguration) {
  const iosPath = path.join(modulePath, 'ios');

  // remove ViewManager from template
  if (!viewManager) {
    await removeFiles(path.join(iosPath, 'EXModuleTemplate'), [
      `EXModuleTemplateView.h`,
      `EXModuleTemplateView.m`,
      `EXModuleTemplateViewManager.h`,
      `EXModuleTemplateViewManager.m`,
    ])
  }

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
 * Sets all versions in Gradle to 1.0.0
 * @param modulePath - module directory
 * @param configuration - naming configuration
 */
async function configureAndroid(modulePath: string, { javaPackage, jsModuleName, viewManager }: ModuleConfiguration) {
  const androidPath = path.join(modulePath, 'android');
  const sourceFilesPath = path.join(
    androidPath,
    'src',
    'main',
    'kotlin',
    'expo',
    'modules',
    'template',
  );
  const destinationFilesPath = path.join(
    androidPath,
    'src',
    'main',
    'kotlin',
    ...javaPackage.split('.'),
  );

  // remove ViewManager from template
  if (!viewManager) {
    removeFiles(sourceFilesPath, [
      `ModuleTemplateView.kt`,
      `ModuleTemplateViewManager.kt`,
    ]);

    replaceContent(path.join(sourceFilesPath, 'ModuleTemplatePackage.kt'), packageContent =>
      packageContent
        .replace(/(^\s+)+(^.*?){1}createViewManagers[\s\W\w]+?\}/m, '')
        .replace(/^.*ViewManager$/, '')
    );
  }

  await fse.mkdirp(destinationFilesPath);
  await fse.copy(sourceFilesPath, destinationFilesPath);

  // Remove leaf directory content
  await fse.remove(sourceFilesPath);
  // Cleanup all empty subdirs up to provided rootDir
  await removeUponEmptyOrOnlyEmptySubdirs(path.join(androidPath, 'src', 'main', 'kotlin', 'expo'));

  const moduleName = jsModuleName.startsWith('Expo') ? jsModuleName.substring(4) : jsModuleName;
  await replaceContents(androidPath, singleFileContent =>
    singleFileContent
      .replace(/expo\.modules\.template/g, javaPackage)
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
    ['.kt'],
    [
      { from: 'ModuleTemplateModule', to: `${moduleName}Module` },
      { from: 'ModuleTemplatePackage', to: `${moduleName}Package` },
      { from: 'ModuleTemplateView', to: `${moduleName}View` },
      { from: 'ModuleTemplateViewManager', to: `${moduleName}ViewManager` },
    ]
  );
}

/**
 * Prepares TS part.
 * @param modulePath - module directory
 * @param configuration - naming configuration
 */
async function configureTS(modulePath: string, { jsModuleName, viewManager }: ModuleConfiguration) {
  const moduleNameWithoutExpoPrefix = jsModuleName.startsWith('Expo') ? jsModuleName.substr(4) : 'Unimodule';
  const tsPath = path.join(modulePath, 'src')

  // remove View Manager from template
  if (!viewManager) {
    await removeFiles(path.join(tsPath), [
      'ExpoModuleTemplateView.tsx',
      'ExpoModuleTemplateNativeView.ts',
      'ExpoModuleTemplateNativeView.web.tsx',
    ]);
    await replaceContent(path.join(tsPath, 'ModuleTemplate.ts'), fileContent =>
      fileContent
        .replace(/(^\s+)+(^.*?){1}ExpoModuleTemplateView.*$/m, '')
    )
  }

  await renameFilesWithExtensions(
    path.join(tsPath, '__tests__'),
    ['.ts'],
    [{ from: 'ModuleTemplate-test', to: `${moduleNameWithoutExpoPrefix}-test` }],
  );
  await renameFilesWithExtensions(
    tsPath,
    ['.tsx', '.ts'],
    [
      { from: 'ExpoModuleTemplateView', to: `${jsModuleName}View` },
      { from: 'ExpoModuleTemplateNativeView', to: `${jsModuleName}NativeView` },
      { from: 'ExpoModuleTemplateNativeView.web', to: `${jsModuleName}NativeView.web` },
      { from: 'ExpoModuleTemplate', to: jsModuleName },
      { from: 'ExpoModuleTemplate.web', to: `${jsModuleName}.web` },
      { from: 'ModuleTemplate', to: moduleNameWithoutExpoPrefix },
      { from: 'ModuleTemplate.types', to: `${moduleNameWithoutExpoPrefix}.types` }
    ]
  );

  await replaceContents(tsPath, singleFileContent =>
    singleFileContent
      .replace(/ExpoModuleTemplate/g, jsModuleName)
      .replace(/ModuleTemplate/g, moduleNameWithoutExpoPrefix)
  );
}

/**
 * Prepares files for npm (package.json and README.md).
 * @param modulePath - module directory
 * @param configuration - naming configuration
 */
async function configureNPM(modulePath: string, { npmModuleName, podName, jsModuleName }: ModuleConfiguration) {
  const moduleNameWithoutExpoPrefix = jsModuleName.startsWith('Expo') ? jsModuleName.substr(4) : 'Unimodule';
  await replaceContent(path.join(modulePath, 'package.json'), singleFileContent =>
    singleFileContent
      .replace(/expo-module-template/g, npmModuleName)
      .replace(/"version": "[\w.-]+"/, '"version": "1.0.0"')
      .replace(/ExpoModuleTemplate/g, jsModuleName)
      .replace(/ModuleTemplate/g, moduleNameWithoutExpoPrefix)
  );
  await replaceContent(path.join(modulePath, 'README.md'), readmeContent =>
    readmeContent
      .replace(/expo-module-template/g, npmModuleName)
      .replace(/ExpoModuleTemplate/g, jsModuleName)
      .replace(/EXModuleTemplate/g, podName)
  );
}

/**
 * Configures TS, Android and iOS parts of generated module mostly by applying provided renamings.
 * @param modulePath - module directory
 * @param configuration - naming configuration
 */
export default async function configureModule(newModulePath: string, configuration: ModuleConfiguration) {
  await configureNPM(newModulePath, configuration);
  await configureTS(newModulePath, configuration);
  await configureAndroid(newModulePath, configuration);
  await configureIOS(newModulePath, configuration);
}
