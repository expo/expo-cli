'use strict';

const Env = jest.genMockFromModule('../Env');

Env.home.mockImpl(() => {
  return '/home';
});

module.exports = Env;
