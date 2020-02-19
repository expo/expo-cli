import { ExpoConfig, fileExistsAsync } from '@expo/config';
import fs from 'fs-extra';
import invariant from 'invariant';
import path from 'path';
import rimraf from 'rimraf';

import Api from '../Api';
import * as Modules from '../modules/Modules';
import * as Utils from '../Utils';
import * as Versions from '../Versions';
import {
  isDirectory,
  parseSdkMajorVersion,
  rimrafDontThrow,
  spawnAsyncThrowError,
  transformFileContentsAsync,
} from './ExponentTools';
import installPackagesAsync from './installPackagesAsync';
import * as IosPlist from './IosPlist';
import { renderPodfileAsync } from './IosPodsTools.js';
import logger from './Logger';
import {
  AnyStandaloneContext,
  isStandaloneContextService,
  isStandaloneContextUser,
} from './StandaloneContext';

export { setBundleIdentifier } from './IosSetBundleIdentifier';

async function _getVersionedExpoKitConfigAsync(
  sdkVersion: string,
  skipServerValidation: boolean
): Promise<{ iosClientVersion: string; iosExpoViewUrl?: string }> {
  const versions = await Versions.versionsAsync();
  let sdkVersionConfig: Pick<Versions.SDKVersion, 'iosVersion' | 'iosExpoViewUrl'> =
    versions.sdkVersions[sdkVersion];
  if (!sdkVersionConfig) {
    if (skipServerValidation) {
      sdkVersionConfig = {};
    } else {
      throw new Error(`Unsupported SDK version: ${sdkVersion}`);
    }
  }
  const { iosVersion, iosExpoViewUrl } = sdkVersionConfig;
  const iosClientVersion = iosVersion ? iosVersion : versions.iosVersion;
  return {
    iosClientVersion,
    iosExpoViewUrl,
  };
}

async function _getOrCreateTemplateDirectoryAsync(
  context: AnyStandaloneContext,
  iosExpoViewUrl: string
): Promise<string | undefined> {
  if (isStandaloneContextService(context)) {
    return path.join(context.data.expoSourcePath, '..');
  } else if (isStandaloneContextUser(context)) {
    let expoRootTemplateDirectory;
    if (process.env.EXPO_VIEW_DIR) {
      // Only for testing
      expoRootTemplateDirectory = process.env.EXPO_VIEW_DIR;
    } else {
      // HEY: if you need other paths into the extracted archive, be sure and include them
      // when the archive is generated in `ios/pipeline.js`
      expoRootTemplateDirectory = path.join(context.data.projectPath, 'temp-ios-directory');
      if (!isDirectory(expoRootTemplateDirectory)) {
        fs.mkdirpSync(expoRootTemplateDirectory);
        logger.info('Downloading iOS code...');
        invariant(iosExpoViewUrl, `The URL for ExpoKit iOS must be set`);
        await Api.downloadAsync(iosExpoViewUrl, expoRootTemplateDirectory, {
          extract: true,
        });
      }
    }
    return expoRootTemplateDirectory;
  }
  return undefined;
}

async function _renameAndMoveProjectFilesAsync(
  context: AnyStandaloneContext,
  projectDirectory: string,
  projectName: string
): Promise<void> {
  // remove .gitignore, as this actually pertains to internal expo template management
  try {
    const gitIgnorePath = path.join(projectDirectory, '.gitignore');
    if (fs.existsSync(gitIgnorePath)) {
      rimraf.sync(gitIgnorePath);
    }
  } catch (e) {}

  const filesToTransform = [
    path.join('exponent-view-template.xcodeproj', 'project.pbxproj'),
    path.join('exponent-view-template.xcworkspace', 'contents.xcworkspacedata'),
    path.join(
      'exponent-view-template.xcodeproj',
      'xcshareddata',
      'xcschemes',
      'exponent-view-template.xcscheme'
    ),
  ];

  let bundleIdentifier: string;
  if (isStandaloneContextUser(context)) {
    const exp = context.data.exp;
    bundleIdentifier = exp.ios && exp.ios.bundleIdentifier ? exp.ios.bundleIdentifier : null;
    if (!bundleIdentifier) {
      throw new Error(`Cannot configure an ExpoKit workspace with no iOS bundle identifier.`);
    }
  } else if (isStandaloneContextService(context)) {
    bundleIdentifier = 'host.exp.Exponent';
  }

  await Promise.all(
    filesToTransform.map(fileName =>
      transformFileContentsAsync(path.join(projectDirectory, fileName), fileString => {
        return fileString
          .replace(/com.getexponent.exponent-view-template/g, bundleIdentifier)
          .replace(/exponent-view-template/g, projectName);
      })
    )
  );

  // order of this array matters
  const filesToMove = [
    'exponent-view-template',
    path.join(
      'exponent-view-template.xcodeproj',
      'xcshareddata',
      'xcschemes',
      'exponent-view-template.xcscheme'
    ),
    'exponent-view-template.xcodeproj',
    'exponent-view-template.xcworkspace',
  ];

  filesToMove.forEach(async fileName => {
    let destFileName = path.join(path.dirname(fileName), `${projectName}${path.extname(fileName)}`);
    await spawnAsyncThrowError('/bin/mv', [
      path.join(projectDirectory, fileName),
      path.join(projectDirectory, destFileName),
    ]);
  });
}

async function _configureVersionsPlistAsync(
  configFilePath: string,
  standaloneSdkVersion: string
): Promise<void> {
  await IosPlist.modifyAsync(configFilePath, 'EXSDKVersions', versionConfig => {
    versionConfig.sdkVersions = [standaloneSdkVersion];
    versionConfig.detachedNativeVersions = {
      shell: standaloneSdkVersion,
      kernel: standaloneSdkVersion,
    };
    return versionConfig;
  });
}

async function _configureBuildConstantsPlistAsync(
  configFilePath: string,
  context: AnyStandaloneContext
): Promise<void> {
  await IosPlist.modifyAsync(configFilePath, 'EXBuildConstants', constantsConfig => {
    constantsConfig.STANDALONE_CONTEXT_TYPE = context.type;
    return constantsConfig;
  });
}

async function _renderPodfileFromTemplateAsync(
  context: AnyStandaloneContext,
  expoRootTemplateDirectory: string,
  sdkVersion: string,
  iosClientVersion: string
): Promise<void> {
  const { iosProjectDirectory, projectName } = getPaths(context);
  let podfileTemplateFilename;
  let podfileSubstitutions: { [key: string]: any } = {
    TARGET_NAME: projectName,
  };
  let reactNativeDependencyPath;
  let modulesPath;

  const detachableUniversalModules = Modules.getDetachableModules(
    'ios',
    // @ts-ignore: Property 'shellAppSdkVersion' does not exist on type 'StandaloneContextDataUser'.
    context.data.shellAppSdkVersion || sdkVersion
  );
  if (isStandaloneContextUser(context)) {
    invariant(iosClientVersion, `The iOS client version must be specified`);
    reactNativeDependencyPath = path.join(context.data.projectPath, 'node_modules', 'react-native');
    modulesPath = path.join(context.data.projectPath, 'node_modules');

    podfileSubstitutions.EXPOKIT_TAG = `ios/${iosClientVersion}`;
    podfileTemplateFilename = 'ExpoKit-Podfile';
  } else if (isStandaloneContextService(context)) {
    reactNativeDependencyPath = path.join(
      expoRootTemplateDirectory,
      'react-native-lab',
      'react-native'
    );
    modulesPath = path.join(expoRootTemplateDirectory, 'packages');

    podfileSubstitutions.EXPOKIT_PATH = path.relative(
      iosProjectDirectory,
      expoRootTemplateDirectory
    );
    podfileSubstitutions.VERSIONED_REACT_NATIVE_PATH = path.relative(
      iosProjectDirectory,
      path.join(expoRootTemplateDirectory, 'ios', 'versioned-react-native')
    );
    podfileTemplateFilename = 'ExpoKit-Podfile-versioned';
  } else {
    throw new Error(`Unsupported context type: ${(context as any).type}`);
  }
  podfileSubstitutions.REACT_NATIVE_PATH = path.relative(
    iosProjectDirectory,
    reactNativeDependencyPath
  );
  podfileSubstitutions.UNIVERSAL_MODULES_PATH = path.relative(iosProjectDirectory, modulesPath);
  podfileSubstitutions.UNIVERSAL_MODULES = detachableUniversalModules.map(module => ({
    ...module,
    path: path.join(
      podfileSubstitutions.UNIVERSAL_MODULES_PATH,
      module.libName,
      module.subdirectory
    ),
  }));

  // env flags for testing
  if (process.env.EXPOKIT_TAG_IOS) {
    logger.info(`EXPOKIT_TAG_IOS: Using custom ExpoKit iOS tag...`);
    podfileSubstitutions.EXPOKIT_TAG = process.env.EXPOKIT_TAG_IOS;
  } else if (process.env.EXPO_VIEW_DIR) {
    logger.info('EXPO_VIEW_DIR: Using local ExpoKit source for iOS...');
    podfileSubstitutions.EXPOKIT_PATH = path.relative(
      iosProjectDirectory,
      process.env.EXPO_VIEW_DIR
    );
    // If EXPO_VIEW_DIR is defined overwrite UNIVERSAL_MODULES with paths pointing to EXPO_VIEW_DIR
    podfileSubstitutions.UNIVERSAL_MODULES = podfileSubstitutions.UNIVERSAL_MODULES.map(
      (module: any) => ({
        ...module,
        path: path.relative(
          iosProjectDirectory,
          // @ts-ignore: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
          path.join(process.env.EXPO_VIEW_DIR, 'packages', module.libName, module.subdirectory)
        ),
      })
    );
  }
  const templatePodfilePath = path.join(
    expoRootTemplateDirectory,
    'template-files',
    'ios',
    podfileTemplateFilename
  );
  await renderPodfileAsync(
    templatePodfilePath,
    path.join(iosProjectDirectory, 'Podfile'),
    podfileSubstitutions,
    // @ts-ignore: Property 'shellAppSdkVersion' does not exist on type 'StandaloneContextDataUser'.
    context.data.shellAppSdkVersion,
    sdkVersion
  );
}

export async function createDetachedAsync(context: AnyStandaloneContext): Promise<void> {
  const { iosProjectDirectory, projectName, supportingDirectory, projectRootDirectory } = getPaths(
    context
  );
  logger.info(`Creating ExpoKit workspace at ${iosProjectDirectory}...`);

  const standaloneSdkVersion = await getNewestSdkVersionSupportedAsync(context);

  let iosClientVersion;
  let iosExpoViewUrl;
  if (isStandaloneContextUser(context)) {
    ({ iosClientVersion, iosExpoViewUrl } = await _getVersionedExpoKitConfigAsync(
      standaloneSdkVersion,
      // @ts-ignore: Type 'undefined' is not assignable to type 'boolean'.
      process.env.EXPO_VIEW_DIR
    ));
  }

  const expoRootTemplateDirectory = (await _getOrCreateTemplateDirectoryAsync(
    context,
    iosExpoViewUrl
  )) as string;

  // copy template workspace
  logger.info('Moving iOS project files...');
  logger.info('Attempting to create project directory...');
  fs.mkdirpSync(iosProjectDirectory);
  logger.info('Created project directory! Copying files:');
  await Utils.ncpAsync(
    path.join(expoRootTemplateDirectory, 'exponent-view-template', 'ios'),
    iosProjectDirectory
  );

  const projectPackageJsonPath = path.join(projectRootDirectory, 'package.json');

  if (!(await fileExistsAsync(projectPackageJsonPath))) {
    logger.info('Copying blank package.json...');
    await fs.copy(
      path.join(expoRootTemplateDirectory, 'exponent-view-template', 'package.json'),
      projectPackageJsonPath
    );
  }

  logger.info('Installing required packages...');
  await _installRequiredPackagesAsync(projectRootDirectory, standaloneSdkVersion);

  logger.info('Naming iOS project...');
  await _renameAndMoveProjectFilesAsync(context, iosProjectDirectory, projectName);

  logger.info('Configuring iOS dependencies...');
  // this configuration must happen prior to build time because it affects which
  // native versions of RN we depend on.
  await _configureVersionsPlistAsync(supportingDirectory, standaloneSdkVersion);
  await _configureBuildConstantsPlistAsync(supportingDirectory, context);
  await _renderPodfileFromTemplateAsync(
    context,
    expoRootTemplateDirectory,
    standaloneSdkVersion,
    iosClientVersion
  );

  if (!process.env.EXPO_VIEW_DIR) {
    if (isStandaloneContextUser(context)) {
      rimrafDontThrow(expoRootTemplateDirectory);
    }
    await IosPlist.cleanBackupAsync(supportingDirectory, 'EXSDKVersions', false);
  }
}

async function _getPackagesToInstallWhenEjecting(
  sdkVersion: string
): Promise<{ [name: string]: string } | undefined | null> {
  const versions = await Versions.versionsAsync();
  return versions.sdkVersions[sdkVersion]
    ? versions.sdkVersions[sdkVersion].packagesToInstallWhenEjecting
    : null;
}

// @tsapeta: Temporarily copied from Detach._detachAsync. This needs to be invoked also when creating a shell app workspace
// and not only when ejecting. These copies can be moved to one place if we decide to have just one flow for these two processes.
async function _installRequiredPackagesAsync(
  projectRoot: string,
  sdkVersion: string
): Promise<void> {
  const packagesToInstallWhenEjecting = await _getPackagesToInstallWhenEjecting(sdkVersion);
  const packagesToInstall: string[] = [];

  if (packagesToInstallWhenEjecting && typeof packagesToInstallWhenEjecting === 'object') {
    Object.keys(packagesToInstallWhenEjecting).forEach(packageName => {
      packagesToInstall.push(`${packageName}@${packagesToInstallWhenEjecting[packageName]}`);
    });
  }
  if (packagesToInstall.length) {
    await installPackagesAsync(projectRoot, packagesToInstall);
  }
}

export function addDetachedConfigToExp(exp: ExpoConfig, context: AnyStandaloneContext): ExpoConfig {
  if (!isStandaloneContextUser(context)) {
    logger.warn(`Tried to modify exp for a non-user StandaloneContext, ignoring`);
    return exp;
  }
  const { supportingDirectory } = getPaths(context);
  if (!exp.ios) exp.ios = {};

  exp.ios.publishBundlePath = path.relative(
    context.data.projectPath,
    path.join(supportingDirectory, 'shell-app.bundle')
  );
  exp.ios.publishManifestPath = path.relative(
    context.data.projectPath,
    path.join(supportingDirectory, 'shell-app-manifest.json')
  );
  return exp;
}

type IosWorkspacePaths = {
  projectRootDirectory: string;
  intermediatesDirectory: string;
  iosProjectDirectory: string;
  projectName: string;
  supportingDirectory: string;
};

/**
 *  paths returned:
 *    iosProjectDirectory - root directory of an (uncompiled) xcworkspace and obj-c source tree
 *    projectName - xcworkspace project name normalized from context.config
 *    supportingDirectory - location of Info.plist, xib files, etc. during configuration.
 *      for an unbuilt app this is underneath iosProjectDirectory. for a compiled app it's just
 *      a path to the flat xcarchive.
 *    intermediatesDirectory - temporary spot to write whatever files are needed during the
 *      detach/build process but can be discarded afterward.
 */
export function getPaths(context: AnyStandaloneContext): IosWorkspacePaths {
  let iosProjectDirectory;
  let projectName;
  let supportingDirectory;
  let intermediatesDirectory;
  let projectRootDirectory;

  if (context.build.isExpoClientBuild()) {
    projectName = 'Exponent';
  } else if (context.isAnonymous()) {
    projectName = 'ExpoKitApp';
  } else if (context.config && context.config.name) {
    let projectNameLabel = context.config.name;
    projectName = projectNameLabel.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  } else {
    throw new Error('Cannot configure an Expo project with no name.');
  }
  if (isStandaloneContextUser(context)) {
    projectRootDirectory = context.data.projectPath;
    iosProjectDirectory = path.join(context.data.projectPath, 'ios');
    supportingDirectory = path.join(iosProjectDirectory, projectName, 'Supporting');
  } else if (isStandaloneContextService(context)) {
    iosProjectDirectory = context?.build?.ios?.workspaceSourcePath!;
    projectRootDirectory = path.dirname(iosProjectDirectory);
    if (context.data.archivePath) {
      // compiled archive has a flat NSBundle
      supportingDirectory = context.data.archivePath;
    } else {
      supportingDirectory = path.join(iosProjectDirectory, projectName, 'Supporting');
    }
  } else {
    throw new Error(`Unsupported StandaloneContext type: ${(context as any).type}`);
  }
  // sandbox intermediates directory by workspace so that concurrently operating
  // contexts do not interfere with one another.
  intermediatesDirectory = path.join(
    iosProjectDirectory,
    context.build.isExpoClientBuild() ? 'ExponentIntermediates' : 'ExpoKitIntermediates'
  );
  return {
    projectRootDirectory,
    intermediatesDirectory,
    iosProjectDirectory,
    projectName,
    supportingDirectory,
  };
}

/**
 * Get the newest sdk version supported given the standalone context.
 * Not all contexts support the newest sdk version.
 */
export async function getNewestSdkVersionSupportedAsync(
  context: AnyStandaloneContext
): Promise<string> {
  if (isStandaloneContextUser(context)) {
    const data = context.data;
    return data.exp.sdkVersion as string;
  }
  const data = context.data;
  // when running in universe or on a turtle machine,
  // we care about what sdk version is actually present in this working copy.
  // this might not be the same thing deployed to our www Versions endpoint.
  let { supportingDirectory } = getPaths(context);
  if (!fs.existsSync(supportingDirectory)) {
    // if we run this method before creating the workspace, we may need to look at the template.
    supportingDirectory = path.join(
      data.expoSourcePath,
      '..',
      'exponent-view-template',
      'ios',
      'exponent-view-template',
      'Supporting'
    );
  }
  const newestVersion = await getNewestSupportedSDKVersionAsync(supportingDirectory);
  // @ts-ignore: This is unsafe
  return newestVersion;
}

async function getNewestSupportedSDKVersionAsync(
  supportingDirectory: string
): Promise<string | undefined> {
  let allVersions: string[] = await getAllSDKVersionsAsync(supportingDirectory);
  let newestVersion: string | undefined;
  let highestMajorComponent = 0;
  allVersions.forEach(version => {
    let majorComponent = parseSdkMajorVersion(version);
    if (majorComponent > highestMajorComponent) {
      highestMajorComponent = majorComponent;
      newestVersion = version;
    }
  });

  return newestVersion;
}

async function getAllSDKVersionsAsync(supportingDirectory: string): Promise<string[]> {
  let allVersions: string[] = [];
  await IosPlist.modifyAsync(supportingDirectory, 'EXSDKVersions', versionConfig => {
    allVersions = versionConfig.sdkVersions;
    return versionConfig;
  });
  return allVersions;
}
