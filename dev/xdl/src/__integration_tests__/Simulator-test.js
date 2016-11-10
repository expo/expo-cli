jasmine.DEFAULT_TIMEOUT_INTERVAL = 40000;

import delayAsync from 'delay-async';

const xdl = require('../xdl');

describe('simulator', () => {
  it('opens and loads url in exponent', async () => {
    let Simulator = xdl.Simulator;
    if (!await Simulator._isSimulatorInstalledAsync()) {
      throw new Error("Simulator isn't installed on this computer; can't run this test.");
    }

    // Quit the simulator to start the test
    if (await Simulator._isSimulatorRunningAsync()) {
      await Simulator._quitSimulatorAsync();
    }

    await delayAsync(1000); // 3 seconds

    // Open the simulator
    await Simulator._openSimulatorAsync();

    await delayAsync(9000); // 3 seconds

    if (!await Simulator._isSimulatorRunningAsync()) {
      throw new Error("Simulator should be running after being opened, but we're detecting that it isn't.");
    }

    if (await Simulator._isExponentAppInstalledOnCurrentBootedSimulatorAsync()) {
      await Simulator._uninstallExponentAppFromSimulatorAsync();
    }
    if (await Simulator._isExponentAppInstalledOnCurrentBootedSimulatorAsync()) {
      throw new Error("Exponent app shouldn't be installed on this simulator but it is");
    }
    await Simulator._installExponentOnSimulatorAsync();
    if (!await Simulator._isExponentAppInstalledOnCurrentBootedSimulatorAsync()) {
      throw new Error("Exponent app should be installed on this simulator but it isn't");
    }

    await Simulator._openUrlInSimulatorAsync('exp://exp.host/@exponent/fluxpybird');

    await delayAsync(6000);

    await Simulator._uninstallExponentAppFromSimulatorAsync();
    if (await Simulator._isExponentAppInstalledOnCurrentBootedSimulatorAsync()) {
      throw new Error("Exponent app shouldn't be installed on this simulator but it is (2)");
    }

    await Simulator._quitSimulatorAsync();
    if (await Simulator._isSimulatorRunningAsync()) {
      throw new Error("Simulator shouldn't be running but it is");
    }
  });
});
