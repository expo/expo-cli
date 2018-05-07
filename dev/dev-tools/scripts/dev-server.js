require('babel-register')({
  only: ['dev-tools/server/*.js', 'dev-tools/server/graphql/*.js', 'dev-tools/scripts/*.js'],
});
require('../server/dev-server.js');
