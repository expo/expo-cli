import { Plugin } from 'esbuild';
import path from 'path';

import { getAssetData } from '../assets/Assets';
import { resolveHashAssetFiles } from '../assets/resolveHashAssetFiles';

function camelize(text: string) {
  text = text.replace(/[-_\s.@]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
  return text.substr(0, 1).toLowerCase() + text.substr(1);
}

function assetsPlugin(projectRoot: string, platform: string, assetExts: string[]) {
  const filter = new RegExp(assetExts.map(ext => `[.]${ext}$`).join('|'));

  const plugin: Plugin = {
    name: 'assets',
    setup(build) {
      build.onResolve({ filter }, args => {
        let assetFile;
        try {
          assetFile = require.resolve(args.path, {
            paths: [process.cwd()],
          });
        } catch (e) {
          assetFile = path.resolve(args.resolveDir, args.path);
        }
        assetFile = assetFile.replace(/\\/g, '/');
        if (path.basename(args.importer) === path.basename(args.path + '.ast.js')) {
          return { path: assetFile, namespace: 'file' };
        }
        return { path: assetFile + '.ast.js', namespace: 'assets' };
      });
      build.onLoad({ filter: /.*/, namespace: 'assets' }, async args => {
        const assetPath = args.path.slice(0, -7).replace(/\\/g, '/');

        const hashAssetFiles = resolveHashAssetFiles(projectRoot);

        const asset = await getAssetData(
          assetPath,
          path.basename(assetPath),
          [hashAssetFiles],
          platform,
          '/assets'
        );

        const contents = `
  const { registerAsset } = require('react-native/Libraries/Image/AssetRegistry.js')
  ${asset.files
    .map(
      file => `const ${camelize(path.parse(file).name)} = require('${file.replace(/\\/g, '/')}')`
    )
    .join('\n')}\n
  const asset = registerAsset(${JSON.stringify(asset, null, 6)})
  module.exports = asset
  `;
        return { contents, loader: 'js', resolveDir: path.resolve(path.parse(args.path).dir) };
      });
    },
  };
  return plugin;
}

export default assetsPlugin;
