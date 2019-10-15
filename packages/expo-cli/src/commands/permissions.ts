import { ExpoConfig, readConfigJsonAsync, writeConfigJsonAsync } from '@expo/config';
import { IosPlist, IosWorkspace } from '@expo/xdl';
import StandaloneContext from '@expo/xdl/build/detach/StandaloneContext';
import * as Manifest from '@expo/android-manifest';
import chalk from 'chalk';
import { Command } from 'commander';
// @ts-ignore
import { Form, MultiSelect } from 'enquirer';
import fs from 'fs-extra';
import path from 'path';

// @ts-ignore
const DefaultiOSPermissions: { [permission: string]: (name: string) => string } = {
  NSCalendarsUsageDescription: (name: string) => `Allow $(PRODUCT_NAME) to access your calendar`,
  NSCameraUsageDescription: (name: string) => `Allow $(PRODUCT_NAME) to use the camera`,
  NSContactsUsageDescription: (name: string) =>
    `Allow $(PRODUCT_NAME) experiences to access your contacts`,
  NSLocationAlwaysUsageDescription: (name: string) => `Allow $(PRODUCT_NAME) to use your location`,
  NSLocationAlwaysAndWhenInUseUsageDescription: (name: string) =>
    `Allow $(PRODUCT_NAME) to use your location`,
  NSLocationWhenInUseUsageDescription: (name: string) =>
    `Allow $(PRODUCT_NAME) experiences to use your location`,
  NSMicrophoneUsageDescription: (name: string) => `Allow $(PRODUCT_NAME) to access your microphone`,
  NSMotionUsageDescription: (name: string) =>
    `Allow $(PRODUCT_NAME) to access your device's accelerometer`,
  NSPhotoLibraryAddUsageDescription: (name: string) =>
    `Give $(PRODUCT_NAME) experiences permission to save photos`,
  NSPhotoLibraryUsageDescription: (name: string) =>
    `Give $(PRODUCT_NAME) experiences permission to access your photos`,
  NSRemindersUsageDescription: (name: string) => `Allow $(PRODUCT_NAME) to access your reminders`,
};

const DefaultiOSPermissionNames: { [key: string]: string } = {
  NSCalendarsUsageDescription: `Calendars`,
  NSCameraUsageDescription: `Camera`,
  NSContactsUsageDescription: `Contacts`,
  NSLocationAlwaysUsageDescription: `Always location`,
  NSLocationAlwaysAndWhenInUseUsageDescription: `Always location and when in use`,
  NSLocationWhenInUseUsageDescription: `Location when in use`,
  NSMicrophoneUsageDescription: `Microphone`,
  NSMotionUsageDescription: `Motion`,
  NSPhotoLibraryAddUsageDescription: `Saving Photos`,
  NSPhotoLibraryUsageDescription: `Camera Roll`,
  NSRemindersUsageDescription: `Reminders`,
};

const CHEVRON = `\u203A`;

type AnyPermissions = { [permission: string]: string };

async function writePermissionsToIOSAsync(
  projectDir: string,
  { ios = {} }: ExpoConfig,
  permissions: { [permission: string]: string | undefined }
): Promise<void> {
  console.log(
    chalk.magenta(
      `${CHEVRON} Saving selection to the ${chalk.underline`expo.ios.infoPlist`} object in your universal ${chalk.bold`app.json`}...`
    )
  );

  await writeConfigJsonAsync(projectDir, {
    ios: {
      ...ios,
      infoPlist: {
        ...(ios.infoPlist || {}),
        ...permissions,
      },
    },
  });
}

function getPermissionDescription(
  appName: string,
  { ios = {} }: ExpoConfig,
  permission: string
): string {
  // @ts-ignore
  const { infoPlist = {} } = ios;

  if (permission in infoPlist && typeof infoPlist[permission] === 'string') {
    return infoPlist[permission];
  }
  return getDefaultExpoPermissionDescription(appName, permission);
}

function getDefaultExpoPermissionDescription(appName: string, permission: string): string {
  const getDefault = DefaultiOSPermissions[permission];
  if (!getDefault) {
    throw new Error(`No permission for ${permission}`);
  }
  return getDefault(appName);
}

async function getActiveAndroidPermissionsAsync(
  manifestPath: string | null,
  exp: ExpoConfig
): Promise<string[]> {
  console.log('');

  let permissions: string[];
  // The Android Manifest takes priority over the app.json
  if (manifestPath) {
    console.log(
      chalk.magenta(
        `${CHEVRON} Getting permissions from the native ${chalk.bold`AndroidManifest.xml`}`
      )
    );
    const manifest = await Manifest.readAsync(manifestPath);
    permissions = Manifest.getPermissions(manifest);
    // Remove the required permissions
    permissions = permissions.filter(v => v !== 'android.permission.INTERNET');
  } else {
    console.log(
      chalk.magenta(
        `${CHEVRON} Getting permissions from the ${chalk.underline`expo.android.permissions`} array in the universal ${chalk.bold`app.json`}...`
      )
    );
    permissions = (exp.android || {}).permissions;
    // If no array is defined then that means all permissions will be used
    if (!Array.isArray(permissions)) {
      console.log(
        chalk.magenta(
          `${CHEVRON} ${chalk.underline`expo.android.permissions`} does not exist in the ${chalk.bold`app.json`}, the default value is ${chalk.bold`all permissions`}`
        )
      );
      permissions = Object.keys(Manifest.UnimodulePermissions);
    }
  }

  // Ensure the names are formatted correctly
  permissions = permissions.map(permission => Manifest.ensurePermissionNameFormat(permission));

  return permissions;
}

export async function actionAndroid(projectDir: string = './'): Promise<void> {
  const { exp } = await readConfigJsonAsync(projectDir);

  const manifestPath = await Manifest.getProjectAndroidManifestPathAsync(projectDir);

  const permissions = await getActiveAndroidPermissionsAsync(manifestPath, exp);

  const isExpo = !manifestPath;

  const choices: { name: string; message: string }[] = [];
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
      const descriptions: AnyPermissions = {
        // TODO(Bacon): Add descriptions of what each permission is used for
      };
      return descriptions[Object.keys(Manifest.UnimodulePermissions)[this.index]];
    },
    initial: permissions,
    hint:
      '(Use <space> to select, <return> to submit, <a> to toggle, <i> to inverse the selection)',
    message: `Select Android permissions`,
    choices,
  });

  console.log('');

  let answer: string[];

  try {
    answer = await prompt.run();
  } catch (error) {
    console.log(chalk.yellow(`${CHEVRON} Exiting...`));
    return;
  }

  const selectedAll = choices.length === answer.length;

  console.log(
    chalk.magenta(
      `${CHEVRON} Saving selection to the ${chalk.underline`expo.android.permissions`} array in the ${chalk.bold`app.json`}...`
    )
  );
  if (isExpo) {
    if (selectedAll) {
      console.log(
        chalk.magenta(
          `${CHEVRON} Expo will default to using all permissions in your project by deleting the ${chalk.underline`expo.android.permissions`} array.`
        )
      );
    }
  }

  await writeConfigJsonAsync(projectDir, {
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
      chalk.magenta(`${CHEVRON} Saving selection to the native ${chalk.bold`AndroidManifest.xml`}`)
    );

    await Manifest.persistAndroidPermissionsAsync(projectDir, [
      'android.permission.INTERNET',
      ...answer,
    ]);
  }
}

type IOSPermissionChoice = { name: string; message: string; initial: string };

async function promptForPermissionDescriptionsAsync(
  choices: IOSPermissionChoice[],
  hasNativeConfig: boolean,
  currentDescriptions: AnyPermissions
): Promise<AnyPermissions> {
  console.log('');

  const keys = Object.keys(DefaultiOSPermissionNames);
  const prompt = new Form({
    name: hasNativeConfig ? 'Native project' : 'Universal Project',
    message: 'Modify iOS Permissions',
    header() {
      const permission = keys[this.index];
      if (!currentDescriptions[permission]) {
        return chalk.magenta(
          `${CHEVRON} Add a description to enable the "${chalk.bold(
            permission
          )}" permission in your iOS app`
        );
      }
      return chalk.magenta(
        `${CHEVRON} Update the description for the permission "${chalk.bold(permission)}"`
      );
    },
    choices,
  });

  try {
    const answer: AnyPermissions = await prompt.run();
    // Trimming allows users to pass in " " to delete a permission
    return Object.keys(answer).reduce(
      (prev, curr) => ({
        ...prev,
        [curr]: answer[curr].trim(),
      }),
      {}
    );
  } catch (error) {
    console.log(chalk.yellow(`${CHEVRON} Exiting...`));
    process.exit(0);
  }
  return {};
}

export async function actionIOS(projectDir: string = './'): Promise<void> {
  const { exp } = await readConfigJsonAsync(projectDir);

  const appName = exp.name!;

  const context = await StandaloneContext.createUserContext(projectDir, exp, '');

  const supportingDirectory = getInfoPlistDirectory(context);

  let infoPlist: AnyPermissions | undefined;

  console.log('');
  let currentDescriptions: AnyPermissions = {};
  let defaultExpoDescriptions: AnyPermissions = {};
  if (supportingDirectory) {
    console.log(chalk.magenta(`${CHEVRON} Using native ios ${chalk.bold`Info.plist`}`));
    infoPlist = (await IosPlist.modifyAsync(
      supportingDirectory,
      'Info',
      infoPlist => infoPlist
    )) as AnyPermissions;

    for (const key of Object.keys(DefaultiOSPermissionNames)) {
      if (key in infoPlist && infoPlist[key]) {
        currentDescriptions[key] = infoPlist[key];
      } else {
        currentDescriptions[key] = '';
      }
    }
  } else {
    if ((exp.ios || {}).infoPlist) {
      console.log(
        chalk.magenta(
          `${CHEVRON} Getting permissions from the ${chalk.underline`expo.ios.infoPlist`} object in the universal ${chalk.bold`app.json`}...`
        )
      );
    } else {
      console.log(
        chalk.magenta(
          `${CHEVRON} Showing the default permissions used by ${chalk.bold`Turtle`} to build your project...`
        )
      );
    }
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

  const choices: IOSPermissionChoice[] = [];
  for (const key of Object.keys(currentDescriptions)) {
    choices.push({
      name: key,
      message: DefaultiOSPermissionNames[key],
      initial: currentDescriptions[key],
    });
  }

  const answer = await promptForPermissionDescriptionsAsync(
    choices,
    !!supportingDirectory,
    currentDescriptions
  );

  const modifiedAnswers: { [key: string]: string | undefined } = Object.keys(answer).reduce(
    (previous, current) => {
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
    },
    {}
  );

  await writePermissionsToIOSAsync(projectDir, exp, modifiedAnswers);

  if (supportingDirectory && infoPlist) {
    console.log(
      chalk.magenta(`${CHEVRON} Saving selection to the native ${chalk.bold`Info.plist`}...`)
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
  } else {
    console.log(
      `${CHEVRON} ${chalk.bold`Remember:`} ${chalk.reset
        .dim`Permission messages are a build-time configuration. Your selection will only be available in Standalone, or native builds. You will continue to see the predefined permission dialogs when using your app in the Expo client.`}`
    );
  }
}

// Find the location of the native iOS info.plist if it exists
// TODO(Bacon): Search better
function getInfoPlistDirectory(context: any): string | null {
  const { supportingDirectory } = IosWorkspace.getPaths(context);
  if (fs.existsSync(path.resolve(supportingDirectory, 'Info.plist'))) {
    return supportingDirectory;
  } else if (fs.existsSync(path.resolve(supportingDirectory, '..', 'Info.plist'))) {
    return path.resolve(supportingDirectory, '..');
  }
  return null;
}

function command(program: Command) {
  program
    .command('permissions:ios [project-dir]')
    .description('Manage permissions in your native iOS project.')
    .allowOffline()
    .asyncAction(actionIOS);

  program
    .command('permissions:android [project-dir]')
    .description('Manage permissions in your native Android project.')
    .allowOffline()
    .asyncAction(actionAndroid);
}

// @ts-ignore
export default command;
