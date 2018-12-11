export async function checkIfWSLIsInstalled() {
  if (DEBUG) {
    log.warn(APPLE_ERRORS);
  }

  if (process.platform === 'win32') {
    const [version] = release().match(/\d./);
    if (version !== '10') {
      log.warn('Must be on at least Windows version 10 for WSL support to work');
    }
    const { username } = userInfo();
    if (username && username.split(' ').length !== 1) {
      log.warn('Your username should not have empty space in it, exp might fail');
    }
    // Does bash.exe exist?
    try {
      await fs.access(WSL_BASH, fs.constants.F_OK);
    } catch (e) {
      log.warn(ENABLE_WSL);
    }
  }
}
