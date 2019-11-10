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
        ignoreDeclarationSort: true,
      },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
