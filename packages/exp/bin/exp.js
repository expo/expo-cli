#!/usr/bin/env node
'use strict';
var whyIsNodeRunning = require('why-is-node-running');
/* var net = require('net'); */

// validate that used node version is supported
var semver = require('semver');
var ver = process.versions.node;
ver = ver.split('-')[0]; // explode and truncate tag from version

if (semver.satisfies(ver, '>=6.0.0')) {
  require('../build/exp.js').run('exp');
} else {
  console.log(
    require('chalk').red(
      'Node version ' + ver + ' is not supported, please use Node.js 6.0 or higher.'
    )
  );
  process.exit(1);
}

setInterval(function() {
  console.log('foo');
  whyIsNodeRunning(); // logs out active handles that are keeping node running
}, 5000);

// verify that TCP servermap gets printed
/* function createServer() {
  var server = net.createServer();
  setInterval(function() {}, 1000);
  server.listen(0);
}

createServer(); */
