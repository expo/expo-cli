module.exports = {
  testRegex: '/__tests__/.*(test|spec)\\.(j|t)sx?$',
  moduleFileExtensions: ['js', 'ts', 'json'],
  moduleNameMapper: {
    '^jest/(.*)': '../../jest/$1',
  },
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: require.resolve('./babel.config.js') }],
  },
  testEnvironment: 'node',
};
