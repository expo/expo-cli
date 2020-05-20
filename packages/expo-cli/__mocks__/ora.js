const ora = jest.fn(() => {
  return {
    start: jest.fn(() => {
      return { stop: jest.fn(), succeed: jest.fn(), fail: jest.fn() };
    }),
  };
});

module.exports = ora;
