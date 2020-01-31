import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { ExpoConfig } from '@expo/config';
import chalk from 'chalk';
import { AnyConfiguration, Environment } from '../types';
import { enableWithPropertyOrConfig } from '../utils/config';
import { getAbsolute, getConfig, getMode } from '../env';

/**
 * @internal
 */
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

/**
 *
 * @param param0
 * @internal
 */
export function throwDeprecatedConfig({ web = {} }: ExpoConfig) {
  const { build = {} } = web;

  if (typeof build.report !== 'undefined') {
    throw new Error(
      'expo.web.build.report is deprecated. Please extend webpack.config.js and use env.report instead.'
    );
  }
}

/**
 *
 * @param env
 * @internal
 */
export function maybeWarnAboutRebuilds(env: Environment) {
  const mode = getMode(env);
  if (mode === 'development') {
    console.log(
      chalk.bgYellow.black`Generating a report, this will add noticeably more time to rebuilds.`
    );
  }
}

/**
 * Generate a bundle analysis and stats.json via the `webpack-bundle-analyzer` plugin.
 *
 * @param webpackConfig Existing Webpack config to modify.
 * @param env Use the `report` prop to enable and configure reporting tools.
 * @category addons
 */
export default function withReporting(
  webpackConfig: AnyConfiguration,
  env: Environment
): AnyConfiguration {
  // Force deprecate the report option in the app.json in favor of modifying the Webpack config directly.
  throwDeprecatedConfig(getConfig(env));

  const reportConfig = enableWithPropertyOrConfig(env.report, DEFAULT_REPORTING_OPTIONS, true);

  // If reporting isn't enabled then bail out.
  if (!reportConfig) {
    return webpackConfig;
  }
  // webpack-bundle-analyzer adds time to builds
  // if verbose mode is turned on then we should inform developers about why re-builds are slower.
  if (reportConfig.verbose) {
    maybeWarnAboutRebuilds(env);
  }
  const reportDir = reportConfig.path;
  if (!Array.isArray(webpackConfig.plugins)) webpackConfig.plugins = [];

  webpackConfig.plugins.push(
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

  return webpackConfig;
}
