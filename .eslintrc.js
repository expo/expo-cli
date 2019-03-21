module.exports = {
  extends: ['universe/node'],
  globals: {
    jasmine: false,
  },
  rules: {
    'no-constant-condition': ['error', { checkLoops: false }],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
