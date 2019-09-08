import * as ConfigUtils from '@expo/config';
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

// TODO: Bacon: link to resources about required permission prompts

const AndroidPermissions: any = {
  ACCESS_COARSE_LOCATION: 'ACCESS_COARSE_LOCATION',
  ACCESS_FINE_LOCATION: 'ACCESS_FINE_LOCATION',
  CAMERA: 'CAMERA',
  MANAGE_DOCUMENTS: 'MANAGE_DOCUMENTS',
  READ_CONTACTS: 'READ_CONTACTS',
  READ_CALENDAR: 'READ_CALENDAR',
  WRITE_CALENDAR: 'WRITE_CALENDAR',
  READ_EXTERNAL_STORAGE: 'READ_EXTERNAL_STORAGE',
  READ_PHONE_STATE: 'READ_PHONE_STATE',
  RECORD_AUDIO: 'RECORD_AUDIO',
  USE_FINGERPRINT: 'USE_FINGERPRINT',
  VIBRATE: 'VIBRATE',
  WAKE_LOCK: 'WAKE_LOCK',
  WRITE_EXTERNAL_STORAGE: 'WRITE_EXTERNAL_STORAGE',
  'com.anddoes.launcher.permission.UPDATE_COUNT': 'com.anddoes.launcher.permission.UPDATE_COUNT',
  'com.android.launcher.permission.INSTALL_SHORTCUT':
    'com.android.launcher.permission.INSTALL_SHORTCUT',
  'com.google.android.c2dm.permission.RECEIVE': 'com.google.android.c2dm.permission.RECEIVE',
  'com.google.android.gms.permission.ACTIVITY_RECOGNITION':
    'com.google.android.gms.permission.ACTIVITY_RECOGNITION',
  'com.google.android.providers.gsf.permission.READ_GSERVICES':
    'com.google.android.providers.gsf.permission.READ_GSERVICES',
  'com.htc.launcher.permission.READ_SETTINGS': 'com.htc.launcher.permission.READ_SETTINGS',
  'com.htc.launcher.permission.UPDATE_SHORTCUT': 'com.htc.launcher.permission.UPDATE_SHORTCUT',
  'com.majeur.launcher.permission.UPDATE_BADGE': 'com.majeur.launcher.permission.UPDATE_BADGE',
  'com.sec.android.provider.badge.permission.READ':
    'com.sec.android.provider.badge.permission.READ',
  'com.sec.android.provider.badge.permission.WRITE':
    'com.sec.android.provider.badge.permission.WRITE',
  'com.sonyericsson.home.permission.BROADCAST_BADGE':
    'com.sonyericsson.home.permission.BROADCAST_BADGE',
};

const AndroidPermissionDescriptions: any = {
  ACCESS_COARSE_LOCATION: 'cool description ACCESS_COARSE_LOCATION',
  ACCESS_FINE_LOCATION: 'cool description ACCESS_FINE_LOCATION',
  CAMERA: 'cool description CAMERA',
  MANAGE_DOCUMENTS: 'cool description MANAGE_DOCUMENTS',
  READ_CONTACTS: 'cool description READ_CONTACTS',
  READ_CALENDAR: 'cool description READ_CALENDAR',
  WRITE_CALENDAR: 'cool description WRITE_CALENDAR',
  READ_EXTERNAL_STORAGE: 'cool description READ_EXTERNAL_STORAGE',
  READ_PHONE_STATE: 'cool description READ_PHONE_STATE',
  RECORD_AUDIO: 'cool description RECORD_AUDIO',
  USE_FINGERPRINT: 'cool description USE_FINGERPRINT',
  VIBRATE: 'cool description VIBRATE',
  WAKE_LOCK: 'cool description WAKE_LOCK',
  WRITE_EXTERNAL_STORAGE: 'cool description WRITE_EXTERNAL_STORAGE',
  'com.anddoes.launcher.permission.UPDATE_COUNT': 'com.anddoes.launcher.permission.UPDATE_COUNT',
  'com.android.launcher.permission.INSTALL_SHORTCUT':
    'com.android.launcher.permission.INSTALL_SHORTCUT',
  'com.google.android.c2dm.permission.RECEIVE': 'com.google.android.c2dm.permission.RECEIVE',
  'com.google.android.gms.permission.ACTIVITY_RECOGNITION':
    'com.google.android.gms.permission.ACTIVITY_RECOGNITION',
  'com.google.android.providers.gsf.permission.READ_GSERVICES':
    'com.google.android.providers.gsf.permission.READ_GSERVICES',
  'com.htc.launcher.permission.READ_SETTINGS': 'com.htc.launcher.permission.READ_SETTINGS',
  'com.htc.launcher.permission.UPDATE_SHORTCUT': 'com.htc.launcher.permission.UPDATE_SHORTCUT',
  'com.majeur.launcher.permission.UPDATE_BADGE': 'com.majeur.launcher.permission.UPDATE_BADGE',
  'com.sec.android.provider.badge.permission.READ':
    'com.sec.android.provider.badge.permission.READ',
  'com.sec.android.provider.badge.permission.WRITE':
    'com.sec.android.provider.badge.permission.WRITE',
  'com.sonyericsson.home.permission.BROADCAST_BADGE':
    'com.sonyericsson.home.permission.BROADCAST_BADGE',
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

export async function actionAndroid(projectDir: string = './') {
  const { exp } = await ConfigUtils.readConfigJsonAsync(projectDir);

  let { permissions = [] } = exp.android || {};

  if (!Array.isArray(permissions)) permissions = [];

  let choices = [];
  for (const permission of Object.keys(AndroidPermissions)) {
    choices.push({
      name: AndroidPermissions[permission],
      message: permissions.includes(permission) ? chalk.green(permission) : chalk.gray(permission),
    });
  }
  const prompt = new MultiSelect({
    header() {
      let dude = 'Welcome to my awesome generator!';
      if (this.index > 5) {
        dude = dude.replace('_\u001b[33m´U`\u001b[39m_', '@\u001b[33m´U`\u001b[39m@');
        dude = dude.replace('~', 'O');
      }
      return AndroidPermissionDescriptions[Object.keys(AndroidPermissions)[this.index]]; //!this.state.submitted ? dude + '\n' : '';
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
