let readline = require('readline');
let path = require('path');
let { spawn } = require('child_process');

let lerna = path.join(__dirname, '../node_modules/.bin/lerna');

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('npm two-factor authentication (2FA) is required for publishing');
rl.question('npm one-time password: ', password => {
  rl.close();

  spawn(lerna, ['publish', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NPM_CONFIG_OTP: password }),
  }).on('exit', process.exit);
});
