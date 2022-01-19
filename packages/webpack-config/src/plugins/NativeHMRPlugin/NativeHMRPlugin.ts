import ReactRefreshPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import webpack from 'webpack';

import { isFastRefreshEnabled } from '../../env/defaults';

export const webpackDevClientEntry = require.resolve('../../runtime/webpackHotDevClient');
const reactRefreshOverlayEntry = require.resolve('../../runtime/refresh-interop');

export class HMRPlugin {
  constructor(public config: { isDev: boolean; isNative: boolean }) {}

  apply(compiler: webpack.Compiler) {
    if (this.config?.isDev && isFastRefreshEnabled) {
      new ReactRefreshPlugin(
        this.config.isNative
          ? {
              overlay: false,
            }
          : {
              overlay: {
                entry: webpackDevClientEntry,
                // The expected exports are slightly different from what the overlay exports,
                // so an interop is included here to enable feedback on module-level errors.
                module: reactRefreshOverlayEntry,
                // Since we ship a custom dev client and overlay integration,
                // the bundled socket handling logic can be eliminated.
                sockIntegration: false,
              },
            }
      ).apply(compiler);

      // To avoid the problem from https://github.com/facebook/react/issues/20377
      // we need to move React Refresh entry that `ReactRefreshPlugin` injects to evaluate right
      // before the `WebpackHMRClient` and after `InitializeCore` which sets up React DevTools.
      // Thanks to that the initialization order is correct:
      // 0. Polyfills
      // 1. `InitilizeCore` -> React DevTools
      // 2. Rect Refresh Entry
      // 3. `WebpackHMRClient`
      const getAdjustedEntry = (entry: any) => {
        for (const key in entry) {
          const { import: entryImports = [] } = entry[key];
          const refreshEntryIndex = entryImports.findIndex((value: string) =>
            /ReactRefreshEntry\.js/.test(value)
          );
          if (refreshEntryIndex >= 0) {
            const refreshEntry = entryImports[refreshEntryIndex];
            entryImports.splice(refreshEntryIndex, 1);

            const hmrClientIndex = entryImports.findIndex((value: string) =>
              /webpackHotDevClient\.js/.test(value)
            );
            entryImports.splice(hmrClientIndex, 0, refreshEntry);
          }

          entry[key].import = entryImports;
        }

        return entry;
      };

      if (typeof compiler.options.entry !== 'function') {
        compiler.options.entry = getAdjustedEntry(compiler.options.entry);
      } else {
        const getEntry = compiler.options.entry;
        compiler.options.entry = async () => {
          const entry = await getEntry();
          return getAdjustedEntry(entry);
        };
      }
    }
  }
}
