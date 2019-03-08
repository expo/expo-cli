import opn from 'opn';

import Logger from './Logger';
import * as UrlUtils from './UrlUtils';
import chalk from 'chalk';

export async function openProjectAsync(projectRoot, options) {
  try {
    let url = await UrlUtils.constructWebAppUrlAsync(projectRoot, options);
    opn(url, { wait: false });
    return { success: true, url };
  } catch (e) {
    Logger.global.error(`Couldn't start project on web: ${e.message}`);
    return { success: false, error: e };
  }
}

export function getWebSetupLogs() {
  const appJsonRules = chalk.white(
    `
  ${chalk.whiteBright.bold(`app.json`)}
  {
    "packages": {
  ${chalk.green.bold(`+      "web"`)}
    }
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
