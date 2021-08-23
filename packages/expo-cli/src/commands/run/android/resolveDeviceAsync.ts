import chalk from 'chalk';
import { Android } from 'xdl';

import CommandError from '../../../CommandError';
import Log from '../../../log';

async function ensureEmulatorOpenAsync(device?: Android.Device): Promise<Android.Device> {
  if (!device) {
    const devices = await Android.getAllAvailableDevicesAsync();
    device = devices[0];
  }

  const bootedDevice = await Android.attemptToStartEmulatorOrAssertAsync(device);
  if (!bootedDevice) {
    // TODO: Improve
    throw new CommandError('Unauthorized');
  }
  return bootedDevice;
}

export async function resolveDeviceAsync(device?: string | boolean): Promise<Android.Device> {
  if (!device) {
    return await ensureEmulatorOpenAsync();
  }

  const devices: Android.Device[] = await Android.getAllAvailableDevicesAsync().catch(() => []);

  if (device === true) {
    // --device with no props after
    const device = await Android.promptForDeviceAsync(devices);
    if (!device) {
      throw new CommandError('Select a device to use');
    }
    Log.log(chalk.dim`\u203A Using --device ${device.name}`);
    return device;
  }
  const searchValue = device.toLowerCase();
  const resolved = devices.find(device => {
    return device.name.toLowerCase() === searchValue;
  });

  if (!resolved) {
    throw new CommandError(`No device name matching "${device}"`);
  }

  return await ensureEmulatorOpenAsync(resolved);
}
