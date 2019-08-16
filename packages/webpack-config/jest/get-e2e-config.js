module.exports = ({ extensions }) => {
  const testMatch = ['', ...extensions].reduce((arr, cur) => {
    const platformExtension = cur ? `.${cur}` : '';
    const sourceExtension = `.[jt]s?(x)`;
    return [
      ...arr,
      `**/__tests__/**/*spec${platformExtension}${sourceExtension}`,
      `**/__tests__/**/*test${platformExtension}${sourceExtension}`,
      `**/?(*.)+(spec|test)${platformExtension}${sourceExtension}`,
    ];
  }, []);

  return {
    testMatch,
    roots: ['tests'],
    moduleFileExtensions: ['js', 'json', 'node'],
    resetModules: false,
    preset: 'jest-puppeteer',
  };
};
