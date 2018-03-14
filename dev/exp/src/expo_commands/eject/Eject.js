// @flow

import chalk from 'chalk';
import fse from 'fs-extra';
import matchRequire from 'match-require';
import path from 'path';
import rimraf from 'rimraf';
import spawn from 'cross-spawn';
import { ProjectUtils, Detach, Versions } from 'xdl';
import log from '../../log';

import prompt from '../../prompt';
import { loginOrRegisterIfLoggedOut } from '../../accounts';

export async function ejectAsync(projectRoot: string, options) {
  const filesWithExpo = await filesUsingExpoSdk(projectRoot);
  const usingExpo = filesWithExpo.length > 0;

  let expoSdkWarning;
  if (usingExpo) {
    expoSdkWarning = `${chalk.bold(
      'Warning!'
    )} We found at least one file where your project imports the Expo SDK:
`;

    for (let filename of filesWithExpo) {
      expoSdkWarning += `  ${chalk.cyan(filename)}\n`;
    }

    expoSdkWarning += `
${chalk.yellow.bold(
      'If you choose the "plain" React Native option below, these imports will stop working.'
    )}`;
  } else {
    expoSdkWarning = `\
We didn't find any uses of the Expo SDK in your project, so you should be fine to eject to
"Plain" React Native. (This check isn't very sophisticated, though.)`;
  }

  log(
    `
${expoSdkWarning}
We ${chalk.italic('strongly')} recommend that you read this document before you proceed:
  ${chalk.cyan(
    'https://github.com/react-community/create-react-native-app/blob/master/EJECTING.md'
  )}
Ejecting is permanent! Please be careful with your selection.
`
  );

  let reactNativeOptionMessage = "React Native: I'd like a regular React Native project.";

  if (usingExpo) {
    reactNativeOptionMessage =
      chalk.italic(
        "(WARNING: See above message for why this option may break your project's build)\n  "
      ) + reactNativeOptionMessage;
  }

  const questions = [
    {
      type: 'list',
      name: 'ejectMethod',
      message: 'How would you like to eject from create-react-native-app?',
      default: usingExpo ? 'expoKit' : 'plain',
      choices: [
        {
          name: reactNativeOptionMessage,
          value: 'plain',
        },
        {
          name:
            "ExpoKit: I'll create or log in with an Expo account to use React Native and the Expo SDK.",
          value: 'expoKit',
        },
        {
          name: "Cancel: I'll continue with my current project structure.",
          value: 'cancel',
        },
      ],
    },
  ];

  const ejectMethod =
    options.ejectMethod ||
    (await prompt(questions, {
      nonInteractiveHelp:
        'Please specify eject method (expoKit, plain) with --eject-method option.',
    })).ejectMethod;

  if (ejectMethod === 'plain') {
    const useYarn = await fse.exists(path.resolve('yarn.lock'));
    const npmOrYarn = useYarn ? 'yarn' : 'npm';
    const { configPath, configName } = await ProjectUtils.findConfigFileAsync(projectRoot);
    const { exp, pkg: pkgJson } = await ProjectUtils.readConfigJsonAsync(projectRoot);
    const appJson = configName === 'app.json' ? JSON.parse(await fse.readFile(configPath)) : {};
    if (!exp) throw new Error(`Couldn't read ${configName}`);
    if (!pkgJson) throw new Error(`Couldn't read package.json`);

    let { displayName, name } = appJson;
    if (!displayName || !name) {
      log("We have a couple of questions to ask you about how you'd like to name your app:");
      ({ displayName, name } = await prompt(
        [
          {
            name: 'displayName',
            message: "What should your app appear as on a user's home screen?",
            default: name || exp.name,
            validate: s => {
              return s.length > 0;
            },
          },
          {
            name: 'name',
            message: 'What should your Android Studio and Xcode projects be called?',
            default: pkgJson.name ? stripDashes(pkgJson.name) : undefined,
            validate: s => {
              return s.length > 0 && s.indexOf('-') === -1 && s.indexOf(' ') === -1;
            },
          },
        ],
        {
          nonInteractiveHelp: 'Please specify "displayName" and "name" in app.json.',
        }
      ));
      appJson.displayName = displayName;
      appJson.name = name;
    }
    delete appJson.expo;
    log('Writing app.json...');
    // write the updated app.json file
    await fse.writeFile(path.resolve('app.json'), JSON.stringify(appJson, null, 2));
    log(chalk.green('Wrote to app.json, please update it manually in the future.'));
    const ejectCommand = 'node';
    const ejectArgs = [
      path.resolve('node_modules', 'react-native', 'local-cli', 'cli.js'),
      'eject',
    ];

    const { status } = spawn.sync(ejectCommand, ejectArgs, {
      stdio: 'inherit',
    });

    if (status !== 0) {
      log(chalk.red(`Eject failed with exit code ${status}, see above output for any issues.`));
      log(chalk.yellow('You may want to delete the `ios` and/or `android` directories.'));
      process.exit(1);
    } else {
      log('Successfully copied template native code.');
    }

    const newDevDependencies = [];
    // Try to replace the Babel preset.
    try {
      const projectBabelPath = path.resolve('.babelrc');
      // If .babelrc doesn't exist, the app is using the default config and
      // editing the config is not necessary.
      if (await fse.exists(projectBabelPath)) {
        const projectBabelRc = (await fse.readFile(projectBabelPath)).toString();

        // We assume the .babelrc is valid JSON. If we can't parse it (e.g. if
        // it's JSON5) the error is caught and a message asking to change it
        // manually gets printed.
        const babelRcJson = JSON.parse(projectBabelRc);
        if (babelRcJson.presets && babelRcJson.presets.includes('babel-preset-expo')) {
          babelRcJson.presets = babelRcJson.presets.map(
            preset =>
              preset === 'babel-preset-expo'
                ? 'babel-preset-react-native-stage-0/decorator-support'
                : preset
          );
          await fse.writeFile(projectBabelPath, JSON.stringify(babelRcJson, null, 2));
          newDevDependencies.push('babel-preset-react-native-stage-0');
          log(
            chalk.green(
              `Babel preset changed to \`babel-preset-react-native-stage-0/decorator-support\`.`
            )
          );
        }
      }
    } catch (e) {
      log(
        chalk.yellow(
          `We had an issue preparing your .babelrc for ejection.
If you have a .babelrc in your project, make sure to change the preset
from \`babel-preset-expo\` to \`babel-preset-react-native-stage-0/decorator-support\`.`
        )
      );
      log(chalk.red(e));
    }

    delete pkgJson.main;

    // NOTE: expo won't work after performing a plain eject, so we should delete this
    // it will be a better error message for the module to not be found than for whatever problems
    // missing native modules will cause
    delete pkgJson.dependencies.expo;
    if (pkgJson.devDependencies) {
      delete pkgJson.devDependencies['react-native-scripts'];
      delete pkgJson.devDependencies['jest-expo'];
    }
    if (!pkgJson.scripts) {
      pkgJson.scripts = {};
    }
    pkgJson.scripts.start = 'react-native start';
    pkgJson.scripts.ios = 'react-native run-ios';
    pkgJson.scripts.android = 'react-native run-android';

    if (pkgJson.jest && pkgJson.jest.preset === 'jest-expo') {
      pkgJson.jest.preset = 'react-native';
      newDevDependencies.push('jest-react-native');
    } else if (pkgJson.jest) {
      log(
        `${chalk.bold(
          'Warning'
        )}: it looks like you've changed the Jest preset from jest-expo to ${pkgJson.jest
          .preset}. We recommend you make sure this Jest preset is compatible with ejected apps.`
      );
    }

    // no longer relevant to an ejected project (maybe build is?)
    delete pkgJson.scripts.eject;

    log(`Updating your ${npmOrYarn} scripts in package.json...`);

    await fse.writeFile(path.resolve('package.json'), JSON.stringify(pkgJson, null, 2));

    log(chalk.green('Your package.json is up to date!'));

    // Starting from react-native 0.49.x (SDK 22), react-native eject template includes this out of the box.
    if (!Versions.gteSdkVersion(exp, '22.0.0')) {
      log(`Adding entry point...`);
      const lolThatsSomeComplexCode = `import { AppRegistry } from 'react-native';
import App from './App';
AppRegistry.registerComponent('${appJson.name}', () => App);
`;
      await fse.writeFile(path.resolve('index.js'), lolThatsSomeComplexCode);
      log(chalk.green('Added new entry points!'));
    }

    log(`
Note that using \`${npmOrYarn} start\` will now require you to run Xcode and/or
Android Studio to build the native code for your project.`);

    log('Removing node_modules...');
    rimraf.sync(path.resolve('node_modules'));
    if (useYarn) {
      log('Installing packages with yarn...');
      const args = newDevDependencies.length > 0 ? ['add', '--dev', ...newDevDependencies] : [];
      spawn.sync('yarnpkg', args, { stdio: 'inherit' });
    } else {
      // npm prints the whole package tree to stdout unless we ignore it.
      const stdio = [process.stdin, 'ignore', process.stderr];

      log('Installing existing packages with npm...');
      spawn.sync('npm', ['install'], { stdio });

      if (newDevDependencies.length > 0) {
        log('Installing new packages with npm...');
        spawn.sync('npm', ['install', '--save-dev', ...newDevDependencies], {
          stdio,
        });
      }
    }
  } else if (ejectMethod === 'expoKit') {
    await loginOrRegisterIfLoggedOut();
    await Detach.detachAsync(projectRoot, options);
  } else if (ejectMethod === 'cancel') {
    // we don't want to print the survey for cancellations
    log('OK! If you change your mind you can run this command again.');
    return;
  } else {
    throw new Error(
      `Unrecognized eject method "${ejectMethod}". Valid options are: expoKit, plain.`
    );
  }

  log(
    `${chalk.green('Ejected successfully!')}
Please consider letting us know why you ejected in this survey:
  ${chalk.cyan('https://goo.gl/forms/iD6pl218r7fn9N0d2')}`
  );
}

async function filesUsingExpoSdk(projectRoot: string): Promise<Array<string>> {
  const projectJsFiles = await findJavaScriptProjectFilesInRoot(projectRoot);

  const jsFileContents = (await Promise.all(
    projectJsFiles.map(f => fse.readFile(f))
  )).map((buf, i) => {
    return {
      filename: projectJsFiles[i],
      contents: buf.toString(),
    };
  });

  const filesUsingExpo = [];

  for (let { filename, contents } of jsFileContents) {
    const requires = matchRequire.findAll(contents);

    if (requires.includes('expo')) {
      filesUsingExpo.push(filename);
    }
  }

  filesUsingExpo.sort();

  return filesUsingExpo;
}

function stripDashes(s: string): string {
  let ret = '';

  for (let c of s) {
    if (c !== ' ' && c !== '-') {
      ret += c;
    }
  }

  return ret;
}

async function findJavaScriptProjectFilesInRoot(root: string): Promise<Array<string>> {
  // ignore node_modules
  if (root.includes('node_modules')) {
    return [];
  }

  const stats = await fse.stat(root);

  if (stats.isFile()) {
    if (root.endsWith('.js')) {
      return [root];
    } else {
      return [];
    }
  } else if (stats.isDirectory()) {
    const children = await fse.readdir(root);

    // we want to do this concurrently in large project folders
    const jsFilesInChildren = await Promise.all(
      children.map(f => findJavaScriptProjectFilesInRoot(path.join(root, f)))
    );

    return [].concat.apply([], jsFilesInChildren);
  } else {
    // lol it's not a file or directory, we can't return a honey badger, 'cause it don't give a
    return [];
  }
}
