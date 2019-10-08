// @ts-ignore
import CleanWebpackPlugin from 'clean-webpack-plugin';
import { Configuration } from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { DevConfiguration, Environment } from './types';
import { enableWithPropertyOrConfig } from './utils/config';
import getConfig from './utils/getConfig';
import getMode from './utils/getMode';
import { getPaths } from './utils/paths';

const DEFAULT_REPORT_CONFIG = {
  verbose: false,
  path: 'web-report',
  statsFilename: 'stats.json',
  reportFilename: 'report.html',
};

export default function withReporting(
  webpackConfig: Configuration | DevConfiguration,
  env: Environment
): Configuration | DevConfiguration {
  const config = getConfig(env);
  const mode = getMode(env);
  const isDev = mode === 'development';

  const locations = env.locations || getPaths(env.projectRoot);

  const { build: buildConfig = {} } = config.web;
  /**
   * report: {
   *   verbose: false,
   *   path: "web-report",
   *   statsFilename: "stats.json",
   *   reportFilename: "report.html"
   * }
   */

  const reportConfig = enableWithPropertyOrConfig(env.report, DEFAULT_REPORT_CONFIG, true);
  if (typeof buildConfig.report !== 'undefined') {
    throw new Error(
      'expo.web.build.report is deprecated. Please extend webpack.config.js and use env.report instead.'
    );
  }

  if (reportConfig) {
    if (isDev && reportConfig.verbose) {
      console.log('Generating a report, this will add noticeably more time to rebuilds.');
    }
    const reportDir = reportConfig.path;
    if (!Array.isArray(webpackConfig.plugins)) webpackConfig.plugins = [];

    webpackConfig.plugins.push(
      // Delete the report folder
      new CleanWebpackPlugin([locations.absolute(reportDir)], {
        root: locations.root,
        dry: false,
        verbose: reportConfig.verbose,
      }),
      // Generate the report.html and stats.json
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        defaultSizes: 'gzip',
        generateStatsFile: true,
        openAnalyzer: false,
        ...reportConfig,
        logLevel: reportConfig.verbose ? 'info' : 'silent',
        statsFilename: locations.absolute(reportDir, reportConfig.statsFilename),
        reportFilename: locations.absolute(reportDir, reportConfig.reportFilename),
      })
    );
  }

  return webpackConfig;
}
