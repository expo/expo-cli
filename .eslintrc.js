module.exports = {
  extends: ['universe/node'],
  globals: {
    jasmine: false,
  },
  rules: {
    'no-constant-condition': ['warn', { checkLoops: false }],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
