import fs from 'fs';
import { sync as globSync } from 'glob';
import { join } from 'path';
import { Compiler, Plugin } from 'webpack';
import VirtualModulesPlugin from 'webpack-virtual-modules';

const defaultModule = `const { load } = require('@expo/auto-nav');

export default load({
    // for pages
    context: require.context('./', false, /^((?!_nav).)*\\.[jt]sx?$/, 'sync'),
    // for folders
    deep: require.context('./', true, /\\/*.\\/_nav\\.[jt]sx?$/, 'sync'),
    config: () => require('./_nav.json'),
})`;
/**
 * Convert any asset type to a JS code block that uses React Native's AssetRegistry module.
 */
export class VirtualNavigationPlugin implements Plugin {
  constructor(private config: { projectRoot: string }) {}

  apply(compiler: Compiler) {
    const plugin = new VirtualModulesPlugin();

    const screensPath = join(this.config.projectRoot, 'screens');
    compiler.options.plugins = (compiler.options.plugins || []).concat(plugin);
    plugin.apply(compiler);

    // TODO: Use Webpack virtual fs to avoid reading the files
    compiler.hooks.compilation.tap('MyPlugin', compilation => {
      const getSubDirectoriesRecursive = (path: string) => {
        const dirs = globSync(`${path}/**/*`);
        const subDirs = dirs
          .filter(dir => fs.lstatSync(dir).isDirectory())
          .filter(
            dir =>
              !fs.existsSync(join(dir, '_nav.js')) &&
              !fs.existsSync(join(dir, '_nav.ts')) &&
              !fs.existsSync(join(dir, '_nav.tsx'))
          );
        return subDirs;
      };

      console.log('all:', getSubDirectoriesRecursive(screensPath));

      const addScreen = (at: string) => {
        console.log('Add:', at);

        // TODO: Prevent duplicates
        plugin.writeModule(join(at, '_nav.js'), defaultModule);
      };

      getSubDirectoriesRecursive(screensPath).forEach(addScreen);
    });
  }
}
