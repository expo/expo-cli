'use strict';

const Env = jest.genMockFromModule('../Env');

Env.home.mockImplementation(() => {
  return '/home';
});

module.exports = Env;
