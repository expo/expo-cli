const defaultConfigBabelPreset = () => ({
  presets: [
    [
      // Supports nullish-coalescing, optional-chaining, optional-catch-binding, object-rest-spread, dynamic-import
      // on at least node 10 (oldest LTS version).
      require('@babel/preset-env'),
      {
        targets: {
          // Use the user's current version of node
          node: true,
        },
        // Remove import/export syntax
        modules: 'commonjs',
        // debug: true,
      },
    ],
    // Support TypeScript
    require('@babel/preset-typescript'),
  ],
  plugins: [
    // Support static class properties.
    // We don't support all experimental features (shippedProposals), this is purely for legacy purposes.
    require('@babel/plugin-proposal-class-properties'),
  ],
});

export function getBabelPreset() {
  // TODO: Support overriding this with `babel.app-config.config.js`
  return defaultConfigBabelPreset;
}
