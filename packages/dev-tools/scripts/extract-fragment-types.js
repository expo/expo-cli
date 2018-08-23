require('babel-register')({
  only: ['dev-tools/server/*.js', 'dev-tools/server/**/*.js'],
});
require('../server/extract-fragment-types.js');
