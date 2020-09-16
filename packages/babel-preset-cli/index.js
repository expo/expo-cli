module.exports = () => ({
  presets: [
    [
      require('@babel/preset-env'),
      {
        targets: {
          node: '8.9.0',
        },
        modules: false,
      },
    ],
    require('@babel/preset-typescript'),
  ],
  plugins: [
    require('@babel/plugin-proposal-class-properties'),
    [
      require('@babel/plugin-transform-modules-commonjs'),
      {
        lazy: /* istanbul ignore next */ source => true,
      },
    ],
    require('@babel/plugin-proposal-optional-chaining'),
    require('@babel/plugin-proposal-nullish-coalescing-operator'),
  ],
});
