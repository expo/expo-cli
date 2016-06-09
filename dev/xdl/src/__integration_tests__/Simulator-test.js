'use strict';

jest.disableAutomock();
jest.useRealTimers();
jasmine.DEFAULT_TIMEOUT_INTERVAL = 40000;

import delayAsync from 'delay-async';

import xdl from '../xdl';

describe('simulator', () => {
  it('opens and loads url in exponent', async () => {
    let Simulator = xdl.Simulator;
    if (!await Simulator.isSimulatorInstalledAsync()) {
      throw new Error("Simulator isn't installed on this computer; can't run this test.");
    }

    // Quit the simulator to start the test
    if (await Simulator.isSimulatorRunningAsync()) {
      await Simulator.quitSimulatorAsync();
    }

    await delayAsync(1000); // 3 seconds

    // Open the simulator
    await Simulator.openSimulatorAsync();

    await delayAsync(9000); // 3 seconds

    if (!await Simulator.isSimulatorRunningAsync()) {
      throw new Error("Simulator should be running after being opened, but we're detecting that it isn't.");
    }

    if (await Simulator.isExponentAppInstalledOnCurrentBootedSimulatorAsync()) {
      await Simulator.uninstallExponentAppFromSimulatorAsync();
    }
    if (await Simulator.isExponentAppInstalledOnCurrentBootedSimulatorAsync()) {
      throw new Error("Exponent app shouldn't be installed on this simulator but it is");
    }
    await Simulator.installExponentOnSimulatorAsync();
    if (!await Simulator.isExponentAppInstalledOnCurrentBootedSimulatorAsync()) {
      throw new Error("Exponent app should be installed on this simulator but it isn't");
    }

    await Simulator.openUrlInSimulatorAsync('exp://exp.host/@exponent/fluxpybird');

    await delayAsync(6000);

    await Simulator.uninstallExponentAppFromSimulatorAsync();
    if (await Simulator.isExponentAppInstalledOnCurrentBootedSimulatorAsync()) {
      throw new Error("Exponent app shouldn't be installed on this simulator but it is (2)");
    }

    await Simulator.quitSimulatorAsync();
    if (await Simulator.isSimulatorRunningAsync()) {
      throw new Error("Simulator shouldn't be running but it is");
    }
  });
});
