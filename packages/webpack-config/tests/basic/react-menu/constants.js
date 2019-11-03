import { remote } from 'electron';

export default {
  get isMac() {
    const os = remote.require('os');
    return os.platform() === 'darwin';
  },
};
