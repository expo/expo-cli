import path from 'path';
import proc from 'child_process';
import targz from 'targz';
import fs from 'fs-extra';
import walkSync from 'klaw-sync';

import CommandError from '../CommandError';
import prompt from '../prompt';

const NPM_TEMPLATE_VERSION = '^2.0.1';
const NPM_TEMPLATE = 'expo-module-template';
const TEMP_DIR_NAME = `temp-expo-module-template`;

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
  fs.copySync(sourceModuleDirPath, destinationModuleDirPath);
};

/**
 * Downloads template module `${NPM_TEMPLATE}@${NPM_TEMPLATE_VERSION}` from npm repository and unpacks it to given destination
 * @param {path} destinationModuleDirName
 */
const downloadModuleTempalteDir = async destinationModuleDirName => {
  const archive = proc
    .execSync(`npm pack ${NPM_TEMPLATE}@${NPM_TEMPLATE_VERSION}`)
    .toString()
    .slice(0, -1);

  fs.mkdirpSync(destinationModuleDirName);
  await decompress(archive, destinationModuleDirName);
  fs.unlinkSync(archive);
};

/**
 * Generates CocoaPod name in format `Namepart1Namepart2Namepart3`.
 * For these with `expo` as `partname1` would generate `EXNamepart2...`.
 * @param {string} moduleName - provided module name, expects format: `namepart1-namepart2-namepart3`
 */
const generateCocoaPodDefaultName = moduleName => {
  const wordsToUpperCase = s =>
    s
      .toLowerCase()
      .split('-')
      .map(s => s.charAt(0).toUpperCase() + s.substring(1))
      .join('');

  if (moduleName.toLowerCase().startsWith('expo')) {
    return `EX${wordsToUpperCase(moduleName.substring(4))}`;
  }
  return wordsToUpperCase(lowerCasesModuleName);
};

/**
 * Generates java package name in format `namepart1.namepart2.namepart3`.
 * @param {string} moduleName - provided module name, expects format: `namepart1-namepart2-namepart3`
 */
const generateJavaModuleDefaultName = moduleName => {
  const wordsToJavaModule = s =>
    s
      .toLowerCase()
      .split('-')
      .join('');

  if (moduleName.toLowerCase().startsWith('expo')) {
    return `expo.modules.${wordsToJavaModule(moduleName.substring(4))}`;
  }
  return wordsToJavaModule(moduleName);
};

/**
 * Generates JS/TS module name in format `Namepart1Namepart2Namepart3`.
 * @param {string} moduleName - provided module name, expects format: `namepart1-namepart2-namepart3`
 */
const generateInCodeModuleDefaultName = moduleName => {
  return moduleName
    .toLowerCase()
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.substring(1))
    .join('');
};

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
      if (!fs.existsSync(path.join(directoryPath, fromFilename))) {
        return;
      }
      const toFilename = `${to}${extension}`;
      fs.renameSync(path.join(directoryPath, fromFilename), path.join(directoryPath, toFilename));
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
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = replaceFunction(content);
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
  }
};

/**
 * Prepares iOS part, mainly by renaming all files and some template word in files
 * Versioning is done automatically based on package.json from JS/TS part
 * @param {path} modulePath - module directory
 * @param {string} podName - PodName
 * @param {{ npmModuleName: string, podName: string, javaPackage: string, jsModuleName: string }} configuration - naming configuration
 */
const configureIOS = async (modulePath, { podName, jsModuleName }) => {
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
};

/**
 * Removes all empty subsdirs up to rootDir
 * Recursively enters all subdirs and removes them if one is empty or cantained only empty subdirs
 * @param {path} dirPath - directory path that is being inspected
 * @returns {boolean} whether directory was deleted or not
 */
const removeUponEmptyOrOnlyEmptySubdirs = dirPath => {
  const contents = fs.readdirSync(dirPath);
  const results = contents.map(file => {
    const filePath = path.join(dirPath, file);
    const fileStats = fs.lstatSync(filePath);
    return fileStats.isDirectory() && removeUponEmptyOrOnlyEmptySubdirs(filePath);
  });
  const isRemovable = results.reduce((acc, current) => acc && current, true);
  if (isRemovable) {
    fs.removeSync(dirPath);
  }
  return isRemovable;
};

/**
 * Prepares Android part, mainly by renaming all files and template words in files
 * Sets all version in gradle to 1.0.0
 * @param {path} modulePath - module directory
 * @param {{ npmModuleName: string, podName: string, javaPackage: string, jsModuleName: string }} configuration - naming configuration
 */
const configureAndroid = async (modulePath, { javaPackage, jsModuleName }) => {
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
  fs.mkdirpSync(destinationFilesPath);
  fs.copySync(sourceFilesPath, destinationFilesPath);

  // Remove leaf directory content
  fs.removeSync(sourceFilesPath);
  // Cleunp all empty subdirs up to provided rootDir
  removeUponEmptyOrOnlyEmptySubdirs(path.join(androidPath, 'src', 'main', 'java', 'expo'));

  replaceContents(androidPath, singleFileContent =>
    singleFileContent
      .replace(/expo\.module\.template/g, javaPackage)
      .replace(/ExpoModuleTemplate/g, jsModuleName)
  );

  replaceContent(path.join(androidPath, 'build.gradle'), gradleContent =>
    gradleContent
      .replace(/version = '[\w.-]+'/, "version = '1.0.0'")
      .replace(/versionCode \d+/, 'versionCode 1')
      .replace(/versionName '[\w.-]+'/, "versionName '1.0.0'")
  );
};

/**
 * Prepares JS/TS part with npm package with package.json and README.md
 * @param {string} modulePath - module directory
 * @param {{ npmModuleName: string, podName: string, javaPackage: string, jsModuleName: string }} configuration - naming configuration
 */
const configureTS = async (modulePath, { npmModuleName, podName, jsModuleName }) => {
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
};

/**
 * Prompt user about new module namings.
 * @param {string} suggestedModuleName - suggested module name thta woudl be used to generate all sugestions for each question
 * @returns {Promise<{ npmModuleName: string, podName: string, javaPackage: string, jsModuleName: string }>} - user's answers
 */
const promptQuestions = async suggestedModuleName => {
  const questions = [
    {
      name: 'npmModuleName',
      message: 'How would you like to call your module in JS/npm? (eg. expo-camera)',
      default: suggestedModuleName,
    },
    {
      name: 'podName',
      message: 'How would you like to call your module in CocoaPods? (eg. EXCamera)',
      default: ({ npmModuleName }) => generateCocoaPodDefaultName(npmModuleName),
    },
    {
      name: 'javaPackage',
      message: 'How would you like to call your module in Java? (eg. expo.modules.camera)',
      default: ({ npmModuleName }) => generateJavaModuleDefaultName(npmModuleName),
    },
    {
      name: 'jsModuleName',
      message: 'How would you like to call your module in JS/TS codebase (eg. ExpoCamera)?',
      default: ({ npmModuleName }) => generateInCodeModuleDefaultName(npmModuleName),
    },
  ];
  return prompt(questions);
};

const action = async (newModuleProjectDir, options) => {
  if (options.template !== 'universal') {
    throw new CommandError(
      'UNKNOWN_TEMPLATE',
      `Template not found: '${template}'. Valid options are: [universal]`
    );
  }

  const newModulePathFromArgv = newModuleProjectDir && path.resolve(newModuleProjectDir);
  const newModuleName = newModulePathFromArgv && path.basename(newModulePathFromArgv);
  const newModuleParentPath = newModulePathFromArgv
    ? path.dirname(newModulePathFromArgv)
    : process.cwd();
  const moduleTemporaryPath = path.resolve(newModuleParentPath, TEMP_DIR_NAME);

  if (options.templateDirectory) {
    await copyModuleTemplateDir(path.resolve(options.templateDirectory), moduleTemporaryPath);
  } else {
    await downloadModuleTempalteDir(moduleTemporaryPath);
  }

  const configuration = await promptQuestions(newModuleName);
  const newModulePath = path.resolve(newModuleParentPath, configuration.npmModuleName);

  if (fs.existsSync(newModulePath)) {
    throw new CommandError('MODULE_ALREADY_EXISTS', `Module '${newModulePath}' already exists!`);
  }
  fs.renameSync(moduleTemporaryPath, newModulePath);

  await configureTS(newModulePath, configuration);
  await configureIOS(newModulePath, configuration);
  await configureAndroid(newModulePath, configuration);
};

export default program => {
  program
    .command('generate-module [new-module-project-directory]')
    .alias('gm')
    .option(
      '-t, --template [type]',
      'Module type to be generated [universal]',
      /^(universal)$/i,
      'universal'
    )
    .option(
      '-td, --template-directory [localTemplateDirectory]',
      'Local directory containing module template'
    )
    .description('Generate a module from a template in [new-module-project-directory].')
    .asyncAction(action);
};
