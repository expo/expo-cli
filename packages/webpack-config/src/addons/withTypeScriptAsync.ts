import { fileExistsAsync, resolveModule } from '@expo/config';
import { getPossibleProjectRoot } from '@expo/config/paths';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import PnpWebpackPlugin from 'pnp-webpack-plugin';

import { getAbsolute, getConfig } from '../env';
import { AnyConfiguration, InputEnvironment } from '../types';

/**
 * Enable or disable TypeScript in the Webpack config that's provided.
 * - Disabling will filter out any TypeScript extensions.
 * - Enabling will add fork TS checker to the plugins.
 *
 * @param webpackConfig input Webpack config to modify and return.
 * @param env Environment used to configure the input config.
 * @category addons
 */
export default async function withTypeScriptAsync(
  webpackConfig: AnyConfiguration,
  env: Pick<InputEnvironment, 'config' | 'locations' | 'projectRoot'> = {}
): Promise<AnyConfiguration> {
  const isDev = webpackConfig.mode !== 'production';

  env.projectRoot = env.projectRoot || getPossibleProjectRoot();
  // @ts-ignore
  env.config = env.config || getConfig(env);

  let typeScriptPath: string | null = null;
  try {
    typeScriptPath = resolveModule('typescript', env.projectRoot, {
      nodeModulesPath: env.config?.nodeModulesPath,
    });
  } catch (_) {}

  const tsConfigPath = getAbsolute(env.projectRoot, 'tsconfig.json');

  const isTypeScriptEnabled = Boolean(typeScriptPath && (await fileExistsAsync(tsConfigPath)));

  if (!isTypeScriptEnabled && webpackConfig.resolve?.extensions) {
    webpackConfig.resolve.extensions = webpackConfig.resolve.extensions.filter(extension => {
      // filter out ts and tsx extensions, including .web.ts
      return !extension.endsWith('.ts') && !extension.endsWith('.tsx');
    });
  }

  if (!isTypeScriptEnabled) {
    return webpackConfig;
  }

  if (!webpackConfig.plugins) webpackConfig.plugins = [];

  webpackConfig.plugins.push(
    new ForkTsCheckerWebpackPlugin(
      PnpWebpackPlugin.forkTsCheckerOptions({
        async: isDev,
        typescript: typeScriptPath,
        useTypescriptIncrementalApi: true,
        checkSyntacticErrors: true,

        tsconfig: tsConfigPath,
        reportFiles: [
          '**',
          '!**/__tests__/**',
          '!**/?(*.)(spec|test).*',
          // Add support for CRA projects
          '!**/src/setupProxy.*',
          '!**/src/setupTests.*',
        ],

        compilerOptions: {
          isolatedModules: true,
          noEmit: true,
        },
        // Disable the formatter in production like CRA
        formatter: isDev ? 'codeframe' : undefined,
        silent: true,
      })
    )
  );

  return webpackConfig;
}
