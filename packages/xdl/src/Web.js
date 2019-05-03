import fs from 'fs';
import openBrowser from 'react-dev-utils/openBrowser';
import path from 'path';

import Logger from './Logger';
import * as Doctor from './project/Doctor';
import { readConfigJsonAsync } from './project/ProjectUtils';
import * as UrlUtils from './UrlUtils';

function invokePossibleFunction(objectOrMethod, ...args) {
  if (typeof objectOrMethod === 'function') {
    return objectOrMethod(...args);
  } else {
    return objectOrMethod;
  }
}

export function invokeWebpackConfig(env, argv) {
  // Check if the project has a webpack.config.js in the root.
  const projectWebpackConfig = path.resolve(env.projectRoot, 'webpack.config.js');
  if (fs.existsSync(projectWebpackConfig)) {
    const webpackConfig = require(projectWebpackConfig);
    return invokePossibleFunction(webpackConfig, env, argv);
  }
  // Fallback to the default expo webpack config.
  const config = require('@expo/webpack-config');
  return config(env, argv);
}

export async function openProjectAsync(projectRoot) {
  await Doctor.validateWebSupportAsync(projectRoot);

  try {
    let url = await UrlUtils.constructWebAppUrlAsync(projectRoot);
    openBrowser(url);
    return { success: true, url };
  } catch (e) {
    Logger.global.error(`Couldn't start project on web: ${e.message}`);
    return { success: false, error: e };
  }
}

// If platforms only contains the "web" field
export async function onlySupportsWebAsync(projectRoot) {
  const { exp } = await readConfigJsonAsync(projectRoot);
  if (Array.isArray(exp.platforms) && exp.platforms.length === 1) {
    return exp.platforms[0] === 'web';
  }
  return false;
}
