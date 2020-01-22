const pkg = require('./package.json');
const tsconfig = require('./tsconfig.json');

module.exports = {
  src: './src/index.ts',
  theme: 'markdown',
  target: 'esnext',
  readme: 'none',
  stripInternal: true,
  hideSources: true,
  exclude: tsconfig.exclude,
  includeDeclarations: false,
  excludeExternals: true,
  excludeNotExported: true,
  excludePrivate: true,
  hideGenerator: true,
  mode: 'file',
  name: pkg.name,
  out: 'docs',
  plugin: 'typedoc-plugin-markdown',
};
