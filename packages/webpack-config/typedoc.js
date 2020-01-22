const path = require('path');
const pkg = require('./package.json');
const tsconfig = require('./tsconfig.json');

module.exports = {
  src: './src/index.ts',
  // theme: 'minimal',
  // plugin: 'none',

  mode: 'file',

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
  // markdown
  theme: 'markdown',
  plugin: [
    // path.resolve('./typedoc-no-other-plugin'),
    'typedoc-plugin-markdown',
  ],
  hideSources: true,
  hideBreadcrumbs: true,
};
