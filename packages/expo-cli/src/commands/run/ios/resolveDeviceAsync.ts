import chalk from 'chalk';
import ora from 'ora';
import { SimControl, Simulator } from 'xdl';

import CommandError from '../../../CommandError';
import Log from '../../../log';
import prompt from '../../../prompts';
import { profileMethod } from '../../utils/profileMethod';

async function getSimulatorsAsync(): Promise<SimControl.SimulatorDevice[]> {
  const simulatorDeviceInfo = await SimControl.listAsync('devices');
  return Object.values(simulatorDeviceInfo.devices).reduce((prev, runtime) => {
    return prev.concat(runtime);
  }, []);
}

async function getBuildDestinationsAsync() {
  const devices = (
    await profileMethod(SimControl.listDevicesAsync, 'SimControl.listDevicesAsync')()
  ).filter(device => {
    return device.deviceType === 'device';
  });

  const simulators = await Simulator.sortDefaultDeviceToBeginningAsync(
    await profileMethod(getSimulatorsAsync)()
  );

  return [...devices, ...simulators];
}

export async function resolveDeviceAsync(
  device?: string | boolean
): Promise<SimControl.SimulatorDevice | SimControl.XCTraceDevice> {
  if (!(await profileMethod(Simulator.ensureXcodeCommandLineToolsInstalledAsync)())) {
    throw new CommandError('Unable to verify Xcode and Simulator installation.');
  }
  if (!device) {
    return await profileMethod(
      Simulator.ensureSimulatorOpenAsync,
      'Simulator.ensureSimulatorOpenAsync'
    )();
  }

  const spinner = ora(
    `🔍 Finding ${device === true ? 'devices' : `device ${chalk.cyan(device)}`}`
  ).start();
  const devices: (
    | SimControl.SimulatorDevice
    | SimControl.XCTraceDevice
  )[] = await getBuildDestinationsAsync().catch(() => []);
  spinner.stop();

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
    Log.log(chalk.dim`\u203A Using --device ${value}`);
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
    throw new CommandError(`No device UDID or name matching "${device}"`);
  }

  const isSimulator = !('deviceType' in resolved);
  if (isSimulator) {
    return await Simulator.ensureSimulatorOpenAsync({ udid: resolved.udid });
  }

  return resolved;
}
