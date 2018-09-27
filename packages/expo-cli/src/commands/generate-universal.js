/**
 * @flow
 */
import path from 'path';
import proc from 'child_process';
import targz from 'targz';
import fs from 'fs';
import fsExtra from 'fs-extra';
import replace from 'replace';

import CommandError from '../CommandError';
import prompt from '../prompt';

const NPM_TEMPLATE_VERSION = '^1.0.1';
const TEMP_DIR_NAME = `temp-expo-module-template`;
let archive;

const decompress = async () => {
  return new Promise((resolve, reject) => {
    targz.decompress(
      {
        src: archive,
        dest: TEMP_DIR_NAME,
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

export default (program: any) => {
  program
    .command('generate <template>')
    .description('Generate a module from a template.')
    .asyncAction(async template => {
      if (template !== 'universal') {
        throw new CommandError(
          'UNKNOWN_TEMPLATE',
          `Template not found: '${template}'. Valid options are: universal`
        );
      }
      const configuration = await prompt([
        {
          name: 'jsName',
          message: 'How would you like to call your module in JS/npm? (eg. expo-camera)',
        },
        {
          name: 'podName',
          message:
            'How would you like to call your module in CocoaPods? (eg. EXCamera) (leave empty to not include iOS part)',
        },
        {
          name: 'javaModule',
          message: 'How would you like to call your module in Java? (eg. expo.modules.camera)',
        },
      ]);

      archive = proc
        .execSync(`npm pack expo-module-template@${NPM_TEMPLATE_VERSION}`)
        .toString()
        .slice(0, -1);
      if (!fs.existsSync(TEMP_DIR_NAME)) {
        fs.mkdirSync(TEMP_DIR_NAME);
      }
      await decompress();

      fs.unlinkSync(archive);
      await fsExtra.copy(path.join(TEMP_DIR_NAME, `package`), `${configuration.jsName}`);
      await fsExtra.remove(TEMP_DIR_NAME);

      if (configuration.podName) {
        fs.renameSync(
          path.join(configuration.jsName, `ios`, `EXModuleTemplate.podspec`),
          path.join(configuration.jsName, `ios`, `${configuration.podName}.podspec`)
        );

        fs.renameSync(
          path.join(configuration.jsName, `ios`, `EXModuleTemplate`, `EXModuleTemplate.h`),
          path.join(configuration.jsName, `ios`, `EXModuleTemplate`, `${configuration.podName}.h`)
        );

        fs.renameSync(
          path.join(configuration.jsName, `ios`, `EXModuleTemplate`, `EXModuleTemplate.m`),
          path.join(configuration.jsName, `ios`, `EXModuleTemplate`, `${configuration.podName}.m`)
        );

        fs.renameSync(
          path.join(configuration.jsName, `ios`, `EXModuleTemplate`),
          path.join(configuration.jsName, `ios`, `${configuration.podName}`)
        );

        fs.renameSync(
          path.join(configuration.jsName, `ios`, `EXModuleTemplate.xcodeproj`),
          path.join(configuration.jsName, `ios`, `${configuration.podName}.xcodeproj`)
        );
      } else {
        await fsExtra.remove(path.join(configuration.jsName, `ios`));
      }

      replace({
        regex: 'expo-module-template',
        replacement: configuration.jsName,
        paths: [configuration.jsName],
        recursive: true,
        silent: true,
      });

      replace({
        regex: 'expo.modules.template',
        replacement: configuration.javaModule,
        paths: [configuration.jsName],
        recursive: true,
        silent: true,
      });

      replace({
        regex: 'EXModuleTemplate',
        replacement: configuration.podName,
        paths: [configuration.jsName],
        recursive: true,
        silent: true,
      });

      replace({
        regex: `"version": ".*",`,
        replacement: `"version": "1.0.0",`,
        paths: [path.join(configuration.jsName, `package.json`)],
        recursive: false,
        silent: true,
      });

      const javaDir = path.join(
        configuration.jsName,
        'android',
        'src',
        'main',
        'java',
        ...configuration.javaModule.split('.')
      );
      fsExtra.mkdirpSync(javaDir);

      const placeholderPath = path.join(javaDir, `Placeholder.java`);
      fs.appendFileSync(placeholderPath, `package ${configuration.javaModule};\n`);
      fs.appendFileSync(placeholderPath, `class Placeholder {}`);
    });
};
