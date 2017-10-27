/**
 * @flow
 */

import path from 'path';

import * as IosIcons from './IosIcons';
import * as IosPlist from './IosPlist';
import {
  configureStandaloneIOSInfoPlistAsync,
  configureStandaloneIOSShellPlistAsync,
} from './IosShellApp';
import * as IosWorkspace from './IosWorkspace';
import StandaloneContext from './StandaloneContext';

async function _configureInfoPlistForLocalDevelopmentAsync(
  configFilePath: string,
  exp: any
) {
  let result = await IosPlist.modifyAsync(configFilePath, 'Info', config => {
    // add detached scheme
    if (exp.isDetached && exp.detach.scheme) {
      if (!config.CFBundleURLTypes) {
        config.CFBundleURLTypes = [
          {
            CFBundleURLSchemes: [],
          },
        ];
      }
      config.CFBundleURLTypes[0].CFBundleURLSchemes.push(exp.detach.scheme);
    }
    // for local dev, don't specify device family here
    if (config.UIDeviceFamily) {
      delete config.UIDeviceFamily;
    }
    return config;
  });
  return result;
}

/**
 *  Prints warnings or info about the configured environment for local development.
 */
function _logDeveloperInfoForLocalDevelopment(infoPlist: any) {
  // warn about *UsageDescription changes
  let usageKeysConfigured = [];
  for (let key in infoPlist) {
    if (
      infoPlist.hasOwnProperty(key) &&
      key.indexOf('UsageDescription') !== -1
    ) {
      usageKeysConfigured.push(key);
    }
  }
  if (usageKeysConfigured.length) {
    console.log(
      'We added some permissions keys to `Info.plist` in your detached iOS project:'
    );
    usageKeysConfigured.forEach(key => {
      console.log(`  ${key}`);
    });
    console.log(
      'You may want to revise them to include language appropriate to your project. You can also remove them if your app will never use the corresponding API. See the Apple docs for these keys.'
    );
  }
}

async function _cleanPropertyListBackupsAsync(configFilePath) {
  await IosPlist.cleanBackupAsync(configFilePath, 'EXShell', false);
  await IosPlist.cleanBackupAsync(configFilePath, 'Info', false);
}

async function configureAsync(
  context: StandaloneContext,
  experienceUrl: string
) {
  // TODO: support both types of context
  if (context.type !== 'user') {
    throw new Error(`IosNSBundle only supports user standalone contexts`);
  }
  let {
    iosProjectDirectory,
    projectName,
    supportingDirectory,
  } = IosWorkspace.getPaths(context);

  // TODO: move shell app config methods here and make them operate on context only.
  await configureStandaloneIOSInfoPlistAsync(
    supportingDirectory,
    context.data.exp
  );
  if (context.type === 'user') {
    const infoPlist = await _configureInfoPlistForLocalDevelopmentAsync(
      supportingDirectory,
      context.data.exp
    );
    _logDeveloperInfoForLocalDevelopment(infoPlist);
  }
  await configureStandaloneIOSShellPlistAsync(
    supportingDirectory,
    context.data.exp,
    experienceUrl
  );

  // TODO: change IosIcons to operate on context
  const iconPath = path.join(
    iosProjectDirectory,
    projectName,
    'Assets.xcassets',
    'AppIcon.appiconset'
  );
  await IosIcons.createAndWriteIconsToPathAsync(
    context.data.exp,
    iconPath,
    context.data.projectPath
  );

  console.log('Cleaning up iOS...');
  await _cleanPropertyListBackupsAsync(supportingDirectory);
  return;
}

export { configureAsync };
