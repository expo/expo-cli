// can assume win because we will use this via WSL
if (!(process.platform === 'win32' || process.platform === 'linux')) {
  throw new Error('Not running on platform with Linux available');
}

if (process.platform === 'win32') {
  const fs = require('fs');
  const WSL_BASH = 'C:\\Windows\\system32\\bash.exe';
  fs.access(WSL_BASH, fs.constants.F_OK, function (err) {
    if (err) {
      const msg_1 = 'Does not seem like WSL enabled on this machine. Download a ';
      const msg_2 = 'Linux distro from the Windows Store, run it at least once ';
      const msg_3 = 'and then make sure to run in an admin powershell:\n';
      const msg_4 =
        'Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux\n';
      console.warn(msg_1 + msg_2 + msg_3 + msg_4);
    }
  });
}
