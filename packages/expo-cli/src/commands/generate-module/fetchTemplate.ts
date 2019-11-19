import path from 'path';
import fse from 'fs-extra';
import pacote from 'pacote';
import chalk from 'chalk';
import { Logger } from '@expo/xdl';

const DEFAULT_TEMPLATE = 'expo-module-template@latest';

/**
 * Fetches directory from npm or given templateDirectory into destinationPath
 * @param {path} destinationPath - destination for fetched template
 * @param {string?} template - optional template provided as npm package or local directory
 */
export default async function fetchTemplate(destinationPath: string, template: string | null) {
  if (template && (await fse.pathExists(path.resolve(template)))) {
    // local template
    Logger.global.info(`Using local template: ${chalk.bold(path.resolve(template))}.`);
    await fse.copy(path.resolve(template), destinationPath);
  } else if (template && isNpmPackage(template)) {
    // npm package
    Logger.global.info(`Using NPM package as template: ${chalk.bold(template)}`);
    await pacote.extract(template, destinationPath);
  } else {
    // default npm packge
    Logger.global.info(`Using default NPM package as template: ${chalk.bold(DEFAULT_TEMPLATE)}`);
    await pacote.extract(DEFAULT_TEMPLATE, destinationPath);
  }

  if (await fse.pathExists(path.join(destinationPath, 'template-unimodule.json'))) {
    await fse.move(
      path.join(destinationPath, 'template-unimodule.json'),
      path.join(destinationPath, 'unimodule.json')
    );
  }
}

function isNpmPackage(template: string) {
  return (
    !template.match(/^\./) && // don't start with .
    !template.match(/^_/) && // don't start with _
    template.toLowerCase() === template && // only lowercase
    !/[~'!()*]/.test(template.split('/').slice(-1)[0]) && // don't contain any character from [~'!()*]
    template.match(/^(@([^/]+?)\/)?([^/@]+)(@(\d\.\d\.\d)(-[^/@]+)?)?$/) // has shape (@scope/)?actual-package-name(@0.1.1(-tag.1)?)?
  );
}
