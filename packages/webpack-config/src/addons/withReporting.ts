import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { ExpoConfig } from '@expo/config';
import chalk from 'chalk';
import { AnyConfiguration, Environment } from '../types';
import { enableWithPropertyOrConfig } from '../utils/config';
import { getConfig, getMode, getAbsolute } from '../env';

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
  config: AnyConfiguration,
  env: Environment
): AnyConfiguration {
  throwDeprecatedConfig(getConfig(env));

  const reportConfig = enableWithPropertyOrConfig(env.report, DEFAULT_REPORTING_OPTIONS, true);

  if (!reportConfig) {
    return config;
  }
  if (reportConfig.verbose) {
    maybeWarnAboutRebuilds(env);
  }
  const reportDir = reportConfig.path;
  if (!Array.isArray(config.plugins)) config.plugins = [];

  config.plugins.push(
    // Delete the report folder
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [getAbsolute(env.projectRoot, reportDir)],
      dry: false,
      verbose: reportConfig.verbose,
    }),
    // Generate the report.html and stats.json
    // @ts-ignore
    new BundleAnalyzerPlugin({
      ...reportConfig,
      logLevel: reportConfig.verbose ? 'info' : 'silent',
      statsFilename: getAbsolute(env.projectRoot, reportDir, reportConfig.statsFilename),
      reportFilename: getAbsolute(env.projectRoot, reportDir, reportConfig.reportFilename),
    })
  );

  return config;
}
