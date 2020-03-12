import chalk from 'chalk';
import * as yup from 'yup';

import { Environment, InputEnvironment, Report } from '../types';
import { getPaths } from './paths';
import getConfig from './getConfig';

import { enableWithPropertyOrConfig } from '../utils';

const environmentSchema = yup.object({
  config: yup.object().notRequired(),
  locations: yup.object().notRequired(),
  https: yup.boolean().default(false),
  polyfill: yup.boolean().notRequired(),
  removeUnusedImportExports: yup.boolean().default(false),
  pwa: yup.boolean().notRequired(),
  offline: yup.boolean().notRequired(),
  projectRoot: yup.string().required(),
  mode: yup
    .mixed<'production' | 'development' | 'none'>()
    .oneOf(['production', 'development', 'none']),
  platform: yup
    .mixed<'ios' | 'android' | 'web' | 'electron'>()
    .oneOf(['ios', 'android', 'web', 'electron'])
    .default('web'),
});

const DEFAULT_REPORT = {
  verbose: false,
  path: 'web-report',
  statsFilename: 'stats.json',
  reportFilename: 'report.html',
};

const reportSchema = yup.object({
  verbose: yup.boolean().default(DEFAULT_REPORT.verbose),
  path: yup.string().default(DEFAULT_REPORT.path),
  statsFilename: yup.string().default(DEFAULT_REPORT.statsFilename),
  reportFilename: yup.string().default(DEFAULT_REPORT.reportFilename),
});

/**
 *
 * @param report
 * @category env
 */
export function validateReport(report: boolean | Report): Report | null {
  const reportConfig = enableWithPropertyOrConfig(report, DEFAULT_REPORT, true);
  if (!reportConfig) return null;

  const filledReport: Report = reportSchema.validateSync(reportConfig);
  return filledReport;
}

/**
 *
 * @param env
 * @category env
 */
export function validateEnvironment(env: InputEnvironment): Environment {
  if (typeof env.projectRoot !== 'string') {
    throw new Error(
      `@expo/webpack-config requires a valid projectRoot string value which points to the root of your project`
    );
  }
  warnEnvironmentDeprecation(env, true);

  const filledEnv: any = environmentSchema.validateSync(env);

  if (!env.locations) {
    filledEnv.locations = getPaths(env.projectRoot);
  }

  if (!env.config) {
    filledEnv.config = getConfig(filledEnv);
  }

  if (typeof env.report !== 'undefined') {
    filledEnv.report = validateReport(env.report);
  }

  return filledEnv;
}

let warned: { [key: string]: boolean } = {};

function shouldWarnDeprecated(
  config: { [key: string]: any },
  key: string,
  warnOnce: boolean
): boolean {
  return (!warnOnce || !(key in warned)) && typeof config[key] !== 'undefined';
}

/**
 *
 * @param env
 * @param warnOnce
 * @category env
 * @internal
 */
export function warnEnvironmentDeprecation(env: InputEnvironment, warnOnce: boolean = false) {
  const warnings: { [key: string]: string } = {
    production: 'Please use `mode: "production"` instead.',
    development: 'Please use `mode: "development"` instead.',
    polyfill: '',
  };

  for (const warning of Object.keys(warnings)) {
    if (shouldWarnDeprecated(env, warning, warnOnce)) {
      warned[warning] = true;
      console.warn(
        chalk.bgYellow.black(
          `The environment property \`${warning}\` is deprecated. ${warnings[warning]}`.trim()
        )
      );
    }
  }
}

/**
 * Used for testing
 * @category env
 * @internal
 */
export function _resetWarnings() {
  warned = {};
}
