import { SimControl, Simulator } from '@expo/xdl';
import chalk from 'chalk';

import CommandError from '../../../CommandError';
import prompt from '../../../prompts';

async function getSimulatorsAsync(): Promise<SimControl.SimulatorDevice[]> {
  const simulatorDeviceInfo = await SimControl.listAsync('devices');
  return Object.values(simulatorDeviceInfo.devices).reduce((prev, runtime) => {
    return prev.concat(runtime);
  }, []);
}

async function getBuildDestinationsAsync() {
  const devices = (await SimControl.listDevicesAsync()).filter(device => {
    return device.deviceType === 'device';
  });

  const simulators = await Simulator.sortDefaultDeviceToBeginningAsync(await getSimulatorsAsync());

  return [...devices, ...simulators];
}

export async function resolveDeviceAsync(
  device: string | boolean | undefined
): Promise<SimControl.SimulatorDevice | SimControl.XCTraceDevice> {
  if (!device) {
    return await Simulator.ensureSimulatorOpenAsync();
  }

  const devices = await getBuildDestinationsAsync();

  if (device === true) {
    // --device with no props after
    const { value } = await prompt({
      type: 'autocomplete',
      name: 'value',
      limit: 11,
      message: 'Select a simulator',
      choices: devices.map(item => {
        const isConnected = 'deviceType' in item;
        const isActive = 'state' in item && item.state === 'Booted';
        const symbol = isConnected ? '🔌 ' : '';
        const format = isActive ? chalk.bold : (text: string) => text;
        return {
          title: `${symbol}${format(item.name)}${
            item.osVersion ? chalk.dim(` (${item.osVersion})`) : ''
          }`,
          value: item.udid,
        };
      }),
      suggest: (input: any, choices: any) => {
        const regex = new RegExp(input, 'i');
        return choices.filter((choice: any) => regex.test(choice.title));
      },
    });
    const device = devices.find(device => device.udid === value)!;
    const isSimulator = !('deviceType' in device);
    if (isSimulator) {
      return await Simulator.ensureSimulatorOpenAsync({ udid: device.udid });
    }
    return device;
  }
  const searchValue = device.toLowerCase();
  const resolved = devices.find(device => {
    return device.udid.toLowerCase() === searchValue || device.name.toLowerCase() === searchValue;
  });

  if (!resolved) {
    throw new CommandError(`No device UDID or name matching ${device}`);
  }

  const isSimulator = !('deviceType' in resolved);
  if (isSimulator) {
    return await Simulator.ensureSimulatorOpenAsync({ udid: resolved.udid });
  }

  return resolved;
}
