// can assume win because we will use this via WSL
if (!(process.platform === 'win32' || process.platform === 'linux')) {
  throw new Error('Not running on Linux');
}
