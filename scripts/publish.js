#!/usr/bin/env node

let readline = require('readline');
let path = require('path');
let { spawn } = require('child_process');

function npmPublish(otpPassword) {
  let args = ['publish', ...process.argv.slice(2)];
  console.log(' >', 'npm', args.join(' '));
  let child = spawn('npm', args, {
    stdio: ['inherit', 'inherit', 'pipe'],
    env: otpPassword
      ? Object.assign({}, process.env, { NPM_CONFIG_OTP: otpPassword })
      : process.env,
  });

  let stderr = '';
  child.stderr.on('data', data => {
    stderr += data;
  });
  child.stderr.pipe(process.stderr);
  child.on('exit', code => {
    if (code && /E401/.test(stderr)) {
      console.log('npm two-factor authentication (2FA) is required for publishing');
      let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question('npm one-time password: ', password => {
        rl.close();
        npmPublish();
      });
    } else {
      process.exit(code);
    }
  });
}

npmPublish();
