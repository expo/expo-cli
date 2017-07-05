/**
 * @flow
 */

import slug from 'slugify';

import path from 'path';
import jsonfile from 'jsonfile';
import fse from 'fs-extra';
import spawnAsync from '@expo/spawn-async';
import expJsonTemplate from './templates/exp';
import babelRcTemplate from './templates/babelrc';

type params = {
  projectName: string,
  projectDescription: string,
  projectEntryPoint: string,
};

export default (async function convertProjectAsync(
  projectDir: string,
  { projectName, projectDescription, projectEntryPoint }: params
) {
  let projectSlug = slug(projectName.toLowerCase());

  let expJsonTargetPath = path.join(projectDir, '/exp.json');
  let babelRcTargetPath = path.join(projectDir, '/.babelrc');

  let packageJsonSourcePath = path.join(projectDir, '/package.json');
  let packageJsonTargetPath = path.join(projectDir, '/package.json');

  // Add values to exp.json, save to given path
  let expJson = { ...expJsonTemplate };
  expJson.name = projectName;
  expJson.description = projectDescription || 'No description';
  expJson.slug = projectSlug;
  jsonfile.writeFileSync(expJsonTargetPath, expJson, { spaces: 2 });
  console.log('Wrote exp.json');

  // Add entry point and dependencies to package.json
  let unsupportedPackagesUsed = [];
  let packageJson = jsonfile.readFileSync(packageJsonSourcePath);
  packageJson.dependencies = { ...packageJson.dependencies, ...dependencies };

  // Remove
  Object.keys(packageJson.dependencies).forEach(dep => {
    if (unsupportedPackages[dep]) {
      delete packageJson.dependencies[dep];
      unsupportedPackagesUsed.push(dep);
    }
  });

  // TODO: we don't actually support index.android.js and index.ios.js right now!
  if (
    projectEntryPoint !== 'index.*.js' &&
    projectEntryPoint !== 'index.js' &&
    projectEntryPoint !== 'index.ios.js' &&
    projectEntryPoint !== 'index.android.js'
  ) {
    packageJson.main = projectEntryPoint;
  }
  jsonfile.writeFileSync(packageJsonTargetPath, packageJson, { spaces: 2 });
  console.log('Updated package.json');

  // TODO: Add import Expo from 'expo'; at the top of main file
  // TODO: Add .expo/* to gitignore

  // Copy babelrc
  jsonfile.writeFileSync(babelRcTargetPath, babelRcTemplate, { spaces: 2 });
  console.log('Updated .babelrc');

  // Save next steps to a file, display, exit
  await installAndInstructAsync(projectDir, unsupportedPackagesUsed);
});

const dependencies = {
  '@expo/vector-icons': '~4.0.0',
  expo: '~15.0.0',
  react: '~15.4.2',
  'react-native': 'github:exponent/react-native#sdk-15.0.0',
};

const unsupportedPackages = {
  'react-native-video': `Expo provides a video component for you with the same API as react-native-video. You can use it with "import { Components } from 'expo';" and <Components.Video /> in your render function. `,
  'react-native-svg': `Expo provides react-native-svg for you. You can use it with "import { Components } from 'expo';" and <Components.Svg /> in your render function.`,
  'react-native-maps': `Expo provides react-native-maps for you. You can use it with "import { Components } from 'expo';" and <Components.Map /> in your render function.`,
  'react-native-linear-gradient': `Expo provides react-native-linear-gradient for you. You can use it with "import { Components } from 'expo';" and <Components.LinearGradient /> in your render function.`,
};

function showCompatibilityMessage(packages) {
  if (packages.length) {
    return (
      `Resolve any issues with potentially incompatible packages: \n\n` +
      packages
        .map(pkg => {
          return `** ${pkg}: ${unsupportedPackages[pkg]}`;
        })
        .join('\n') +
      `\n** This may not be an exhaustive list of packages you will need to address -- any package that has a native code dependency will need to be converted to an Expo equivalent or removed. Refer to the SDK API reference here: https://docs.expo.io/versions/latest/sdk/index.html`
    );
  } else {
    return `We didn't detect any known incompatible packages, but if you have any with native dependencies installed, you will need to remove them from your project.`;
  }
}

async function installAndInstructAsync(projectDir, unsupportedPackagesUsed) {
  let nodeModulesPath = path.join(projectDir, '/node_modules');
  let nextStepMessagePath = path.join(projectDir, '/expo-next-steps.txt');

  fse.removeSync(nodeModulesPath);
  console.log('Running npm install, this may take a few minutes.');
  console.log('-----------------------------------------------------');
  let npmInstallError = false;
  try {
    await spawnAsync('npm', ['install'], { cwd: projectDir, stdio: 'inherit' });
  } catch (e) {
    console.log('\n');
    npmInstallError = true;
  }
  console.log('\n');
  console.log('#####################################################');
  console.log('             npm install complete');
  console.log('#####################################################');

  if (npmInstallError) {
    console.log('\n');
    console.log(
      '* There was an error though, please read the error message, try to fix the issue and then run npm install again. No need to run exp convert again.'
    );
  }

  console.log('\n');
  const nextStepMessage = `Next steps:
------------
1. If you have separate index.ios.js and index.android.js files, you'll need to create a main.js file that contains \`require('./index');\`. Also set \`"main": "main.js"\` in package.json.
2. Find your AppRegistry.registerComponent('YourApplicationName', () => YourRootComponent) call and replace it with Expo.registerRootComponent(YourRootComponent) (you will need to import Expo from 'expo').
3. Upload your app icon somewhere on the web and add it the newly created exp.json file, in the iconUrl and loading.iconUrl fields.
4. Delete your 'android' and 'ios' directories if you have them -- you no longer need to compile any native code to run your app.
5. ${showCompatibilityMessage(unsupportedPackagesUsed)}
6. Open your app in XDE and run it, fix bugs as they arise.
`;
  console.log(nextStepMessage);
  fse.outputFileSync(nextStepMessagePath, nextStepMessage);
  console.log(
    '(This message has been saved to expo-next-steps.txt for your convenience)'
  );
}
