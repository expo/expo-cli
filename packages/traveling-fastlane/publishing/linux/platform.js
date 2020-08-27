// can assume win because we will use this via WSL
if (!(process.platform === 'win32' || process.platform === 'linux')) {
  throw new Error('Not running on platform with Linux available');
}

if (process.platform === 'win32') {
  var fs = require('fs');
  var WSL_BASH = 'C:\\Windows\\system32\\bash.exe';
  fs.access(WSL_BASH, fs.constants.F_OK, function (err) {
    if (err) {
      var msg_1 = 'Does not seem like WSL enabled on this machine. Download a ';
      var msg_2 = 'Linux distro from the Windows Store, run it at least once';
      var msg_3 = 'and then make sure to run in an admin powershell:\n';
      var msg_4 =
        'Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux';
      console.warn(msg_1 + msg_2 + msg_3 + msg_4);
    }
  });
}
