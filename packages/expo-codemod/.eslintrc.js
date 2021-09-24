module.exports = {
  extends: ['universe/node', 'universe/web'],
  rules: {
    'react/jsx-fragments': 'off',
  },
  ignorePatterns: ['__testfixtures__', 'build'],
};
