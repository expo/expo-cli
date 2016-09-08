/**
 * @flow
 */

import slug from 'slugify';

import path from 'path';
import jsonfile from 'jsonfile';
import fse from 'fs-extra';
import spawnAsync from '@exponent/spawn-async';
import expJsonTemplate from './templates/exp';
import babelRcTemplate from './templates/babelrc';


export default async function convertProjectAsync(projectDir, {projectName, projectDescription, projectEntryPoint}) {
  let projectSlug = slug(projectName.toLowerCase())

  let expJsonTargetPath = path.join(projectDir, '/exp.json');
  let babelRcTargetPath = path.join(projectDir, '/.babelrc');

  let packageJsonSourcePath = path.join(projectDir, '/package.json');
  let packageJsonTargetPath = path.join(projectDir, '/package.json');

  // Add values to exp.json,) save to given path
  let expJson = {...expJsonTemplate};
  expJson.name = projectName;
  expJson.description = projectDescription;
  expJson.slug = projectSlug;
  jsonfile.writeFileSync(expJsonTargetPath, expJson, {spaces: 2});

  // Add entry point and dependencies to package.json
  let unsupportedPackagesUsed = [];
  let packageJson = jsonfile.readFileSync(packageJsonSourcePath);
  packageJson.dependencies = {...packageJson.dependencies, ...dependencies};

  // Remove
  Object.keys(packageJson.dependencies).forEach(dep => {
    if (unsupportedPackages[dep]) {
      delete packageJson.dependencies[dep];
      unsupportedPackagesUsed.push(dep);
    }
  });

  if (projectEntryPoint !== 'index.*.js' && projectEntryPoint !== 'index.js' && projectEntryPoint !== 'index.ios.js' && projectEntryPoint !== 'index.android.js') {
    packageJson.main = projectEntryPoint;
  }
  jsonfile.writeFileSync(packageJsonTargetPath, packageJson, {spaces: 2});
  console.log('Updated package.json');

  // TODO: Add import Exponent from 'exponent'; at the top of main file
  // TODO: Add .exponent/* to gitignore

  // Copy babelrc
  jsonfile.writeFileSync(babelRcTargetPath, babelRcTemplate, {spaces: 2});
  console.log('Updated .babelrc');

  // Save next steps to a file, display, exit
  await installAndInstructAsync(projectDir, unsupportedPackagesUsed);
}

const dependencies = {
  "@exponent/vector-icons": "^1.0.1",
  "babel-plugin-transform-decorators-legacy": "^1.3.4",
  "babel-preset-react-native-stage-0": "^1.0.1",
  "exponent": "^9.0.2",
  "react": "15.2.1",
  "react-native": "github:exponentjs/react-native#sdk-9.0.0"
};

const unsupportedPackages = {
  'react-native-vector-icons': `We installed @exponent/vector-icons for you instead. Change any use of react-native-vector-icons to this.
For example: "import Icon from 'react-native-vector-icons/Ionicons'" becomes "import { Ionicons as Icon } from '@exponent/vector-icons'" `,
  'react-native-video': `Exponent provides a video component for you with the same API as react-native-video. You can use it with "import { Components } from 'exponent';" and <Components.Video /> in your render function. `,
  'react-native-svg': `Exponent provides react-native-svg for you. You can use it with "import { Components } from 'exponent';" and <Components.Svg /> in your render function.`
};

function showCompatibilityMessage(packages) {
  if (packages.length) {
    return `Resolve any issues with potentially incompatible packages: \n\n` + packages.map(pkg => {
      return `** ${pkg}: ${unsupportedPackages[pkg]}`
    }).join('\n') + `\n** This may not be an exhaustive list of packages you will need to address -- any package that has a native code dependency will need to be converted to an Exponent equivalent or removed. Refer to the SDK API reference here: https://docs.getexponent.com/versions/latest/sdk/index.html`;
  } else {
    return `We didn't detect any known incompatible packages, but if you have any with native dependencies installed, you will need to remove them from your project.`
  }
}

async function installAndInstructAsync(projectDir, unsupportedPackagesUsed) {
  let nodeModulesPath = path.join(projectDir, '/node_modules');
  let nextStepMessagePath = path.join(projectDir, '/exponent-next-steps.txt');

  fse.removeSync(nodeModulesPath);
  console.log('Running npm install, this may take a few minutes.');
  console.log('-----------------------------------------------------');
  let result = await spawnAsync('npm', ['install'], { cwd: projectDir, stdio: 'inherit' });
  console.log('\n');
  console.log('#####################################################');
  console.log('             npm install complete');
  console.log('#####################################################');
  console.log('\n');
  const nextStepMessage = `Next steps:
------------
1. Find your AppRegistry.registerComponent('YourApplicationName', () => RootComponent) call and change YourApplicationName to 'main'.
2. Upload your app icon somewhere on the web and add it the newly created exp.json file, in the iconUrl and loading.iconUrl fields.
3. Delete your 'android' and 'ios' directories if you have them -- you no longer need to compile any native code to run your app.
4. ${showCompatibilityMessage(unsupportedPackagesUsed)}
5. Open your app in XDE and run it, fix bugs as they arise.
`
  console.log(nextStepMessage);
  fse.outputFileSync(nextStepMessagePath, nextStepMessage);
  console.log('(This message has been saved to exponent-next-steps.txt for your convenience)');
}
