'use strict';

const os = require.requireActual('os');

os.homedir = jest.fn(() => '/home');

module.exports = os;
