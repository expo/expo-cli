/**
 * @flow
 */
import path from 'path';
import proc from 'child_process';
import targz from 'targz';
import fs from 'fs-extra';
import walkSync from 'klaw-sync';
import JsonFile from '@expo/json-file';

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

      fs.mkdirpSync(TEMP_DIR_NAME);
      await decompress();

      fs.unlinkSync(archive);
      let outputDir = path.resolve(configuration.jsName);
      await fs.copy(path.join(TEMP_DIR_NAME, `package`), outputDir);
      await fs.remove(TEMP_DIR_NAME);

      if (configuration.podName) {
        fs.renameSync(
          path.join(outputDir, `ios`, `EXModuleTemplate.podspec`),
          path.join(outputDir, `ios`, `${configuration.podName}.podspec`)
        );

        fs.renameSync(
          path.join(outputDir, `ios`, `EXModuleTemplate`, `EXModuleTemplate.h`),
          path.join(outputDir, `ios`, `EXModuleTemplate`, `${configuration.podName}.h`)
        );

        fs.renameSync(
          path.join(outputDir, `ios`, `EXModuleTemplate`, `EXModuleTemplate.m`),
          path.join(outputDir, `ios`, `EXModuleTemplate`, `${configuration.podName}.m`)
        );

        fs.renameSync(
          path.join(outputDir, `ios`, `EXModuleTemplate`),
          path.join(outputDir, `ios`, `${configuration.podName}`)
        );

        fs.renameSync(
          path.join(outputDir, `ios`, `EXModuleTemplate.xcodeproj`),
          path.join(outputDir, `ios`, `${configuration.podName}.xcodeproj`)
        );
      } else {
        await fs.remove(path.join(outputDir, `ios`));
      }

      for (let file of walkSync(outputDir, { nodir: true })) {
        let contents = await fs.readFile(file.path, 'utf8');
        let newContents = contents
          .replace(/expo-module-template/g, configuration.jsName)
          .replace(/expo\.modules\.template/g, configuration.javaModule)
          .replace(/EXModuleTemplate/g, configuration.podName);
        if (newContents !== contents) {
          await fs.writeFile(file.path, newContents);
        }
      }
      await JsonFile.setAsync(path.join(configuration.jsName, 'package.json'), 'version', '1.0.0');

      const javaDir = path.join(
        configuration.jsName,
        'android',
        'src',
        'main',
        'java',
        ...configuration.javaModule.split('.')
      );
      fs.mkdirpSync(javaDir);

      const placeholderPath = path.join(javaDir, `Placeholder.java`);
      fs.appendFileSync(placeholderPath, `package ${configuration.javaModule};\n`);
      fs.appendFileSync(placeholderPath, `class Placeholder {}`);
    });
};
