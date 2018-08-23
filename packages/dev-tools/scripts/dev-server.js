require('babel-register')({
  only: ['dev-tools/server/*.js', 'dev-tools/server/**/*.js'],
});
require('../server/dev-server.js');
