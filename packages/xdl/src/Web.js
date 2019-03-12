import opn from 'opn';
import chalk from 'chalk';
import Logger from './Logger';
import * as UrlUtils from './UrlUtils';
import { readConfigJsonAsync } from './project/ProjectUtils';

export async function openProjectAsync(projectRoot, options) {
  const hasWebSupport = await hasWebSupportAsync(projectRoot);
  if (!hasWebSupport) {
    logWebSetup();
    return { success: false };
  }
  try {
    let url = await UrlUtils.constructWebAppUrlAsync(projectRoot, options);
    opn(url, { wait: false });
    return { success: true, url };
  } catch (e) {
    Logger.global.error(`Couldn't start project on web: ${e.message}`);
    return { success: false, error: e };
  }
}

export function logWebSetup() {
  Logger.global.error(getWebSetupLogs());
}

export async function hasWebSupportAsync(projectRoot) {
  const { exp } = await readConfigJsonAsync(projectRoot);
  const isWebConfigured = exp.platforms.includes('web');
  return isWebConfigured;
}

function getWebSetupLogs() {
  const appJsonRules = chalk.white(
    `
  ${chalk.whiteBright.bold(`app.json`)}
  {
    "platforms": [
      "android",
      "ios",
  ${chalk.green.bold(`+      "web"`)}
    ]
  }`
  );
  const packageJsonRules = chalk.white(
    `
  ${chalk.whiteBright.bold(`package.json`)}
  {
    "dependencies": {
  ${chalk.green.bold(`+      "react-native-web": "^0.11.0",`)}
  ${chalk.green.bold(`+      "react-art": "^16.7.0",`)}
  ${chalk.green.bold(`+      "react-dom": "^16.7.0"`)}
    },
    "devDependencies": {
  ${chalk.green.bold(`+      "babel-preset-expo": "^5.0.0"`)}
    }
  }`
  );
  return `${chalk.red.bold('Your project is not configured to support web yet!')}
  ${packageJsonRules}
    ${appJsonRules}`;
}
