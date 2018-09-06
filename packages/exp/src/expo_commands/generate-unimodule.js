/**
 * @flow
 */
import path from 'path';
import proc from 'child_process';
import prompt from '../prompt';
import targz from 'targz';
import fs from 'fs';
import copy from 'recursive-copy';
import fsExtra from 'fs-extra';
import replace from 'replace';
import os from 'os';
const npmVersionOfTemplate = '1.0.1';

const decompress = async() => {
  return new Promise((resolve, reject) => {
    targz.decompress({
        src: `expo-module-template-${npmVersionOfTemplate}.tgz`,
        dest: 'temp-expo-module-template',
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
    .command('generate-unimodule')
    .description('Generate new unimodule.')
    .asyncAction(async () => {
      let configuration = {
        jsName: null,
        podName: null,
        javaModule: null,
      };

      configuration.jsName = (await prompt({
        message: 'How would you like to call your module in JS/NPM? (eg. expo-camera)',
        name: 'jsName'
      })).jsName;

      configuration.podName = (await prompt({
        message: 'How would you like to call your module in Cocoapods? (eg. EXCamera) (leave empty to not include iOS part)',
        name: 'podName'
      })).podName;

      configuration.javaModule = (await prompt({
        message: 'How would you like to call your module in Java? (eg. expo.modules.camera)',
        name: 'javaModule'
      })).javaModule;

      proc.execSync(`npm pack expo-module-template@${npmVersionOfTemplate}`);
      if (!fs.existsSync('temp-expo-module-template')) {
          fs.mkdirSync('temp-expo-module-template');
      }
      await decompress();

      fs.unlinkSync(`expo-module-template-${npmVersionOfTemplate}.tgz`);
      await copy(path.join(`temp-expo-module-template`, `package`), `${configuration.jsName}`);
      await fsExtra.remove('temp-expo-module-template');

      if (configuration.podName) {
          fs.renameSync(
            path.join(`${configuration.jsName}`, `ios`, `EXModuleTemplate.podspec`),
            path.join(`${configuration.jsName}`, `ios`, `${configuration.podName}.podspec`)
          );

          fs.renameSync(
            path.join(`${configuration.jsName}`, `ios`, `EXModuleTemplate`, `EXModuleTemplate.h`),
            path.join(`${configuration.jsName}`, `ios`, `EXModuleTemplate`, `${configuration.podName}.h`)
          );

          fs.renameSync(
            path.join(`${configuration.jsName}`, `ios`, `EXModuleTemplate`, `EXModuleTemplate.m`),
            path.join(`${configuration.jsName}`, `ios`, `EXModuleTemplate`, `${configuration.podName}.m`)
          );

          fs.renameSync(
            path.join(`${configuration.jsName}`, `ios`, `EXModuleTemplate`),
            path.join(`${configuration.jsName}`, `ios`, `${configuration.podName}`)
          );

          fs.renameSync(
            path.join(`${configuration.jsName}`, `ios`, `EXModuleTemplate.xcodeproj`),
            path.join(`${configuration.jsName}`, `ios`, `${configuration.podName}.xcodeproj`)
          );
      } else {
        await fsExtra.remove(path.join(`${configuration.jsName}`,`ios`));
      }

      await replace({
        regex: "expo-module-template",
        replacement: `${configuration.jsName}`,
        paths:[`${configuration.jsName}`],
        recursive: true,
        slient: true,
      });

      await replace({
        regex: "expo.modules.template",
        replacement: `${configuration.javaModule}`,
        paths:[`${configuration.jsName}`],
        recursive: true,
        slient: true,
      });

      await replace({
        regex: "EXModuleTemplate",
        replacement: `${configuration.podName}`,
        paths:[`${configuration.jsName}`],
        recursive: true,
        slient: true,
      });

      await replace({
        regex: `"version": "[0-9.]+",`,
        replacement: `"version": "1.0.0",`,
        paths:[path.join(`${configuration.jsName}`, `package.json`)],
        recursive: false,
        slient: true,
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

      const placeholderPath = path.join(
        `${javaDir}`,
        `Placeholder.java`
      );
      fs.appendFileSync(`${placeholderPath}`, `package ${configuration.javaModule};${os.EOL}`);
      fs.appendFileSync(`${placeholderPath}`, `class Placeholder {}`);
    });
};
