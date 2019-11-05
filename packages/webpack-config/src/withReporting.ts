// @ts-ignore
import CleanWebpackPlugin from 'clean-webpack-plugin';
import { Configuration } from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { ExpoConfig } from '@expo/config';
import chalk from 'chalk';
import { DevConfiguration, Environment } from './types';
import { enableWithPropertyOrConfig } from './utils/config';
import getConfig from './utils/getConfig';
import getMode from './utils/getMode';
import { getPaths } from './utils/paths';

export const DEFAULT_REPORTING_OPTIONS: BundleAnalyzerPlugin.Options & {
  verbose?: boolean;
  path: string;
} = {
  analyzerMode: 'static',
  defaultSizes: 'gzip',
  generateStatsFile: true,
  openAnalyzer: false,
  verbose: false,
  path: 'web-report',
  statsFilename: 'stats.json',
  reportFilename: 'report.html',
};

export function throwDeprecatedConfig({ web = {} }: ExpoConfig) {
  const { build = {} } = web;

  if (typeof build.report !== 'undefined') {
    throw new Error(
      'expo.web.build.report is deprecated. Please extend webpack.config.js and use env.report instead.'
    );
  }
}

export function maybeWarnAboutRebuilds(env: Environment) {
  const mode = getMode(env);
  if (mode === 'development') {
    console.log(
      chalk.bgYellow.black`Generating a report, this will add noticeably more time to rebuilds.`
    );
  }
}

export default function withReporting(
  config: Configuration | DevConfiguration,
  env: Environment
): Configuration | DevConfiguration {
  throwDeprecatedConfig(getConfig(env));

  const reportConfig = enableWithPropertyOrConfig(env.report, DEFAULT_REPORTING_OPTIONS, true);

  if (!reportConfig) {
    return config;
  }
  const { absolute, root } = env.locations || getPaths(env.projectRoot);
  if (reportConfig.verbose) {
    maybeWarnAboutRebuilds(env);
  }
  const reportDir = reportConfig.path;
  if (!Array.isArray(config.plugins)) config.plugins = [];

  config.plugins.push(
    // Delete the report folder
    new CleanWebpackPlugin([absolute(reportDir)], {
      root,
      dry: false,
      verbose: reportConfig.verbose,
    }),
    // Generate the report.html and stats.json
    new BundleAnalyzerPlugin({
      ...reportConfig,
      logLevel: reportConfig.verbose ? 'info' : 'silent',
      statsFilename: absolute(reportDir, reportConfig.statsFilename),
      reportFilename: absolute(reportDir, reportConfig.reportFilename),
    })
  );

  return config;
}
