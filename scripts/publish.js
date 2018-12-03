#!/usr/bin/env node

let readline = require('readline');
let { spawn } = require('child_process');

console.log('npm two-factor authentication (2FA) is required for publishing');
let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
rl.question('npm one-time password: ', password => {
  rl.close();
  npmPublish(Object.assign({}, process.env, { NPM_CONFIG_OTP: password }));
});

function npmPublish(env) {
  spawn('npm', ['publish', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env,
  }).on('exit', process.exit);
}
