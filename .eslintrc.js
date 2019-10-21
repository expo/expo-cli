module.exports = {
  extends: ['universe/node'],
  globals: {
    jasmine: false,
  },
  rules: {
    'no-constant-condition': ['warn', { checkLoops: false }],
    'sort-imports': [
      'warn',
      {
        ignoreCase: false,
      },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
