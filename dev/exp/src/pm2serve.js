var child_process = require('child_process');
var delayAsync = require('delay-async');
var freeportAsync = require('freeport-async');
var inquirerAsync = require('inquirer-async');
var instapromise = require('instapromise');
var jsonFile = require('@exponent/json-file');
var md5hex = require('@exponent/md5hex');
var path = require('path');
var pm2 = require('pm2');

function packageJsonFullPath() {
  return path.resolve('package.json');
}

async function pm2NameAsync() {
  var packageName = await jsonFile.getAsync('package.json', 'name');
  var pkgJsonHash = md5hex(packageJsonFullPath(), 8);
  return 'exp-serve/' + packageName + ':' + pkgJsonHash;
}

async function getPm2AppByIdAsync(id) {
  // N.B. You need to be connected to PM2 for this to work
  var apps = await pm2.promise.list();
  for (var app of apps) {
    if (app.pm_id === id) {
      return app;
    }
  }
}

async function setupServeAsync(projectDir) {
  if (projectDir) {
    process.chdir(projectDir);
  }
}

async function getPm2AppByNameAsync(name) {
  var a = null;
  var apps = await pm2.promise.list();
  for (var app of apps) {
    if (app.name === name) {
      a = app;
    }
  }
  return a;
}

async function waitForRunningAsync(expFile) {
  var state = await expFile.getAsync('state', null);
  if (state === 'RUNNING') {
    return true;
  } else if (state === 'ERROR') {
    return false;
  } else {
    await delayAsync(500);
    return waitForRunningAsync(expFile);
  }
}

module.exports = {
  setupServeAsync,
  pm2NameAsync,
  getPm2AppByNameAsync,
  waitForRunningAsync,
};
