const pkg = require('./package.json');
const tsconfig = require('./tsconfig.json');

module.exports = {
  src: './src',
  mode: 'modules',
  target: 'esnext',
  readme: 'none',
  name: pkg.name,
  out: 'docs',
  defaultCategory: 'internal',
  stripInternal: true,
  exclude: tsconfig.exclude,
  includeDeclarations: false,
  excludeExternals: true,
  excludeNotExported: true,
  excludePrivate: true,
  excludeProtected: true,
  hideGenerator: true,
  theme: 'markdown',
  plugin: ['typedoc-plugin-markdown'],
};
