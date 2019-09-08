import * as Manifest from '@expo/android-manifest';
import * as ConfigUtils from '@expo/config';
import { IosPlist, IosWorkspace, UserManager } from '@expo/xdl';
import StandaloneContext from '@expo/xdl/build/detach/StandaloneContext';
import chalk from 'chalk';
import { Command } from 'commander';
import { Form, MultiSelect } from 'enquirer';
import fs from 'fs-extra';
import path from 'path';

// @ts-ignore
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
  console.log(
    chalk.magenta(
      `\u203A Saving selection to the ${chalk.underline`expo.ios.infoPlist`} object in your universal ${chalk.bold`app.json`}...`
    )
  );

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

async function getActiveAndroidPermissionsAsync(
  manifestPath: string | null,
  exp: any
): Promise<string[]> {
  console.log('');

  let permissions: string[];
  // The Android Manifest takes priority over the app.json
  if (manifestPath) {
    console.log(
      chalk.magenta(`\u203A Getting permissions from the native ${chalk.bold`AndroidManifest.xml`}`)
    );
    const manifest = await Manifest.readAsync(manifestPath);
    permissions = Manifest.getPermissions(manifest);
    // Remove the required permissions
    permissions = permissions.filter(v => v !== 'android.permission.INTERNET');
  } else {
    console.log(
      chalk.magenta(
        `\u203A Getting permissions from the ${chalk.underline`expo.android.permissions`} array in the universal ${chalk.bold`app.json`}...`
      )
    );
    permissions = (exp.android || {}).permissions;
    // If no array is defined then that means all permissions will be used
    if (!Array.isArray(permissions)) {
      console.log(
        chalk.magenta(
          `\u203A ${chalk.underline`expo.android.permissions`} does not exist in the ${chalk.bold`app.json`}, the default value is ${chalk.bold`all permissions`}`
        )
      );
      permissions = Object.keys(Manifest.UnimodulePermissions);
    }
  }

  // Ensure the names are formatted correctly
  permissions = permissions.map(permission => Manifest.ensurePermissionNameFormat(permission));

  return permissions;
}

export async function actionAndroid(projectDir: string = './') {
  const { exp } = await ConfigUtils.readConfigJsonAsync(projectDir);

  const manifestPath = await Manifest.getProjectAndroidManifestPathAsync(projectDir);

  const permissions = await getActiveAndroidPermissionsAsync(manifestPath, exp);

  const isExpo = !manifestPath;

  let choices = [];
  const allPermissions = [
    ...new Set([...permissions, ...Object.keys(Manifest.UnimodulePermissions)]),
  ];
  for (const permission of allPermissions) {
    choices.push({
      name: permission,
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
    hint:
      '(Use <space> to select, <return> to submit, <a> to toggle, <i> to inverse the selection)',
    message: `Select permissions`,
    choices,
  });

  console.log('');

  let answer;

  try {
    answer = await prompt.run();
  } catch (error) {
    console.log(chalk.yellow('\u203A Exiting...'));
    return;
  }

  const selectedAll = choices.length === answer.length;

  console.log(
    chalk.magenta(
      `\u203A Saving selection to the ${chalk.underline`expo.android.permissions`} array in the ${chalk.bold`app.json`}...`
    )
  );
  if (isExpo && selectedAll) {
    console.log(
      chalk.magenta(
        `\u203A Expo will default to using all permissions in your project by deleting the ${chalk.underline`expo.android.permissions`} array.`
      )
    );
  }

  await ConfigUtils.writeConfigJsonAsync(projectDir, {
    android: {
      ...(exp.android || {}),
      // An empty array means no permissions
      // No value means all permissions
      permissions: selectedAll
        ? undefined
        : answer.map((permission: string) => {
            if (permission.startsWith('android.permission.')) {
              return permission.split('.').pop();
            }
            return permission;
          }),
    },
  });

  if (!isExpo) {
    console.log(
      chalk.magenta(`\u203A Saving selection to the native ${chalk.bold`AndroidManifest.xml`}`)
    );

    await Manifest.persistAndroidPermissionsAsync(projectDir, [
      'android.permission.INTERNET',
      ...answer,
    ]);
  }
}

async function getContextAsync(projectDir: string, exp: any): Promise<any> {
  let user = await UserManager.ensureLoggedInAsync();

  if (!user) {
    throw new Error('Internal error -- somehow detach is being run in offline mode.');
  }

  const { username } = user;
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
    console.log(chalk.magenta(`\u203A Using native ios ${chalk.bold`Info.plist`}`));
    infoPlist = await IosPlist.modifyAsync(supportingDirectory, 'Info', infoPlist => infoPlist);

    for (const key of Object.keys(DefaultiOSPermissionNames)) {
      if (key in infoPlist && infoPlist[key]) {
        currentDescriptions[key] = infoPlist[key];
      } else {
        currentDescriptions[key] = '';
      }
    }
  } else {
    console.log(
      chalk.magenta(
        `\u203A Getting permissions from the ${chalk.underline`expo.ios.infoPlist`} object in the universal ${chalk.bold`app.json`}...`
      )
    );
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
    console.log(
      chalk.magenta(`\u203A Saving selection to the native ${chalk.bold`Info.plist`}...`)
    );
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
