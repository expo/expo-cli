import 'instapromise';

import JsonFile from '@exponent/json-file';

import delayAsync from 'delay-async';
import path from 'path';
import pm2 from 'pm2';
import md5hex from '@exponent/md5hex';

function packageJsonFullPath() {
  return path.resolve('package.json');
}

async function pm2NameAsync() {
  let packageName = await JsonFile.getAsync('package.json', 'name');
  let pkgJsonHash = md5hex(packageJsonFullPath(), 8);
  return `exp-serve/${packageName}:${pkgJsonHash}`;
}

async function getPm2AppByIdAsync(id) {
  // N.B. You need to be connected to PM2 for this to work
  let apps = await pm2.promise.list();
  for (let app of apps) {
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
  let a = null;
  let apps = await pm2.promise.list();
  for (let app of apps) {
    if (app.name === name) {
      a = app;
    }
  }
  return a;
}

async function waitForRunningAsync(expFile) {
  let state = await expFile.getAsync('state', null);
  if (state === 'RUNNING') {
    return true;
  } else if (state === 'ERROR') {
    return false;
  } else {
    await delayAsync(500);
    return await waitForRunningAsync(expFile);
  }
}

module.exports = {
  setupServeAsync,
  pm2NameAsync,
  getPm2AppByNameAsync,
  waitForRunningAsync,
};
