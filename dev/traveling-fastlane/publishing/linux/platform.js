// can assume win because we will use this via WSL
if (!(process.platform === 'win32' || process.platform === 'linux')) {
  throw new Error('Not running on Linux');
}

if (process.platform === 'win32') {
  var fs = require('fs');
  var chalk = require('chalk');
  var WSL_BASH = 'C:\\Windows\\system32\\bash.exe';
  fs.access(WSL_BASH, fs.constants.F_OK, function(err) {
    if (err) {
      var msg_1 =
        'Does not seem like WSL enabled on this machine. In an admin powershell, please run:\n';
      var msg_2 =
        'Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux';
      console.warn(chalk.yellow(msg_1 + msg_2));
    }
  });
}
