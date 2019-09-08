import * as ConfigUtils from '@expo/config';
import * as Manifest from '@expo/android-manifest';
import { IosPlist, IosWorkspace, UserManager } from '@expo/xdl';
import StandaloneContext from '@expo/xdl/build/detach/StandaloneContext';
import chalk from 'chalk';
import { Command } from 'commander';
// @ts-ignore
import { Form, MultiSelect } from 'enquirer';
import fs from 'fs-extra';
import path from 'path';

const DefaultiOSPermissions: any = {
  NSCalendarsUsageDescription: (name: string) =>
    `Allow ${name} experiences to access your calendar`,
  NSCameraUsageDescription: (name: string) =>
    `${name} uses your camera to scan project QR codes. ${name} experiences you open may use the camera with the ${name} camera API.`,
  NSContactsUsageDescription: (name: string) => `Allow ${name} experiences to access your contacts`,
  NSLocationWhenInUseUsageDescription: (name: string) =>
    `Allow ${name} experiences to use your location`,
  NSMicrophoneUsageDescription: (name: string) =>
    `Allow ${name} experiences to access your microphone`,
  NSMotionUsageDescription: (name: string) =>
    `Allow ${name} experiences to access your device's accelerometer`,
  NSPhotoLibraryAddUsageDescription: (name: string) =>
    `Give Expo experiences permission to save photos`,
  NSPhotoLibraryUsageDescription: (name: string) =>
    `Give ${name} experiences permission to access your photos`,
  NSRemindersUsageDescription: (name: string) =>
    `Allow ${name} experiences to access your reminders`,
};

const DefaultiOSPermissionNames: any = {
  NSCalendarsUsageDescription: `Calendars`,
  NSCameraUsageDescription: `Camera`,
  NSContactsUsageDescription: `Contacts`,
  NSLocationWhenInUseUsageDescription: `Location in-use`,
  NSMicrophoneUsageDescription: `Microphone`,
  NSMotionUsageDescription: `Motion`,
  NSPhotoLibraryAddUsageDescription: `Saving Photos`,
  NSPhotoLibraryUsageDescription: `Camera Roll`,
  NSRemindersUsageDescription: `Reminders`,
};

async function writePermissionsToIOSAsync(projectDir: string, exp: any, permissions: any) {
  console.log(chalk.magenta('\u203A Updating the universal app.json...'));

  await ConfigUtils.writeConfigJsonAsync(projectDir, {
    ios: {
      ...(exp.ios || {}),
      infoPlist: {
        ...((exp.ios || {}).infoPlist || {}),
        ...permissions,
      },
    },
  });
}

function getPermissionDescription(appName: string, exp: any, permission: string): Promise<string> {
  // @ts-ignore
  const { infoPlist = {} } = (exp || {}).ios || {};

  if (permission in infoPlist && typeof infoPlist[permission] === 'string') {
    return infoPlist[permission];
  }
  return getDefaultExpoPermissionDescription(appName, permission);
}

function getDefaultExpoPermissionDescription(appName: string, permission: string): Promise<string> {
  const getDefault = DefaultiOSPermissions[permission];
  if (!getDefault) throw new Error('No permission for ' + permission);
  return getDefault(appName);
}

async function getActiveAndroidPermissionsAsync(projectDir: string, exp: any): Promise<string[]> {
  const manifestPath = await Manifest.getProjectAndroidManifestPathAsync(projectDir);
  let permissions: string[];
  // The Android Manifest takes priority over the app.json
  if (manifestPath) {
    const manifest = await Manifest.readAsync(manifestPath);
    permissions = Manifest.getPermissions(manifest);
  } else {
    permissions = (exp.android || {}).permissions;
  }

  if (!Array.isArray(permissions)) {
    permissions = [];
  }

  // Ensure the names are formatted correctly
  permissions = permissions.map(permission => Manifest.ensurePermissionNameFormat(permission));

  return permissions;
}

export async function actionAndroid(projectDir: string = './') {
  const { exp } = await ConfigUtils.readConfigJsonAsync(projectDir);

  const permissions = await getActiveAndroidPermissionsAsync(projectDir, exp);

  let choices = [];
  for (const permission of Object.keys(Manifest.UnimodulePermissions)) {
    choices.push({
      name: Manifest.UnimodulePermissions[permission],
      message: permissions.includes(permission) ? chalk.green(permission) : chalk.gray(permission),
    });
  }
  const prompt = new MultiSelect({
    header() {
      const descriptions: { [key: string]: string } = {
        // TODO(Bacon): Add descriptions of what each permission is used for
      };
      return descriptions[Object.keys(Manifest.UnimodulePermissions)[this.index]];
    },
    initial: permissions,
    hint: '(Use <space> to select, <return> to submit)',
    message: 'Select permissions',
    choices,
  });

  const answer = await prompt.run();
  await ConfigUtils.writeConfigJsonAsync(projectDir, {
    android: {
      ...(exp.android || {}),
      permissions: answer,
    },
  });

  await Manifest.persistAndroidPermissionsAsync(projectDir, answer);
}

async function getContextAsync(projectDir: string, exp: any): Promise<any> {
  let user = await UserManager.ensureLoggedInAsync();

  if (!user) {
    throw new Error('Internal error -- somehow detach is being run in offline mode.');
  }

  let username = user.username;

  let experienceName = `@${username}/${exp.slug}`;
  let experienceUrl = `exp://exp.host/${experienceName}`;
  return StandaloneContext.createUserContext(projectDir, exp, experienceUrl);
}

async function promptForPermissionDescriptionsAsync(
  choices: any,
  hasNativeConfig: boolean,
  currentDescriptions: any
) {
  console.log('');
  const keys = Object.keys(DefaultiOSPermissionNames);
  const prompt = new Form({
    name: 'iOS Permission Descriptions',
    message: hasNativeConfig ? 'Native project' : 'Universal Project',
    header() {
      const permission = keys[this.index];
      if (!currentDescriptions[permission]) {
        return chalk.magenta(
          `\u203A Add a description to enable the "${chalk.bold(
            permission
          )}" permission in your iOS app`
        );
      }
      return chalk.magenta(
        `\u203A Update the description for using the "${chalk.bold(permission)}" permission`
      );
    },
    choices,
  });

  return await prompt.run();
}

export async function action(projectDir: string = './') {
  const { exp } = await ConfigUtils.readConfigJsonAsync(projectDir);

  const appName = exp.name!;

  const context = await getContextAsync(projectDir, exp);

  const supportingDirectory = getInfoPlistDirectory(context);

  let infoPlist: any;

  console.log('');
  let currentDescriptions: any = {};
  let defaultExpoDescriptions: any = {};
  if (supportingDirectory) {
    console.log(chalk.magenta('\u203A Using native ios Info.plist'));
    infoPlist = await IosPlist.modifyAsync(supportingDirectory, 'Info', infoPlist => infoPlist);

    for (const key of Object.keys(DefaultiOSPermissionNames)) {
      if (key in infoPlist && infoPlist[key]) {
        currentDescriptions[key] = infoPlist[key];
      } else {
        currentDescriptions[key] = '';
      }
    }
  } else {
    console.log(chalk.magenta('\u203A Using the universal app.json...'));
    defaultExpoDescriptions = Object.keys(DefaultiOSPermissions).reduce(
      (previous, current) => ({
        ...previous,
        [current]: getDefaultExpoPermissionDescription(appName, current),
      }),
      {}
    );
    currentDescriptions = Object.keys(DefaultiOSPermissions).reduce(
      (previous, current) => ({
        ...previous,
        [current]: getPermissionDescription(appName, exp, current),
      }),
      {}
    );
  }

  let choices = [];
  for (const key of Object.keys(currentDescriptions)) {
    choices.push({
      name: key,
      message: DefaultiOSPermissionNames[key],
      initial: currentDescriptions[key],
    });
  }
  let answer: any;

  try {
    answer = await promptForPermissionDescriptionsAsync(
      choices,
      !!supportingDirectory,
      currentDescriptions
    );
  } catch (error) {
    console.log(chalk.yellow('\u203A Exiting...'));
    return;
  }

  // Trimming allows users to pass in " " to delete a permission
  answer = Object.keys(answer).reduce(
    (prev, curr) => ({
      ...prev,
      [curr]: answer[curr].trim(),
    }),
    {}
  );

  const modifiedAnswers: any = Object.keys(answer).reduce((previous, current) => {
    const permissionDescription = answer[current];

    if (permissionDescription !== defaultExpoDescriptions[current] && permissionDescription) {
      return {
        ...previous,
        [current]: permissionDescription,
      };
    }
    return {
      ...previous,
      [current]: undefined,
    };
  }, {});

  await writePermissionsToIOSAsync(projectDir, exp, modifiedAnswers);

  if (infoPlist) {
    console.log(chalk.magenta('\u203A Updating native Info.plist...'));
    await IosPlist.modifyAsync(supportingDirectory, 'Info', infoPlist => {
      for (const key of Object.keys(answer)) {
        if (answer[key]) {
          infoPlist[key] = answer[key];
        } else {
          delete infoPlist[key];
        }
      }
      return infoPlist;
    });
  }
}

// Find the location of the native iOS info.plist if it exists
// TODO(Bacon): Search better
function getInfoPlistDirectory(context: any) {
  const { supportingDirectory } = IosWorkspace.getPaths(context);
  if (fs.existsSync(path.resolve(supportingDirectory, 'Info.plist'))) {
    return supportingDirectory;
  } else if (fs.existsSync(path.resolve(supportingDirectory, '..', 'Info.plist'))) {
    return path.resolve(supportingDirectory, '..');
  }
  return null;
}

// @ts-ignore
export default (program: Command) => {
  program
    .command('permissions:ios [project-dir]')
    .description('Manage permissions in your native iOS project.')
    .allowOffline()
    .asyncAction(action);

  program
    .command('permissions:android [project-dir]')
    .description('Manage permissions in your native Android project.')
    .allowOffline()
    .asyncAction(actionAndroid);
};
