import delayAsync from 'delay-async';

import * as Simulator from '../Simulator';

describe.skip('simulator', () => {
  it('opens and loads url in expo', async () => {
    // This tests depends on the simulator, and could take some time to boot
    jest.setTimeout(60000);

    // Determine if we can run this test or not, if simulator isn't available warn and stop
    if (!(await Simulator._isSimulatorInstalledAsync())) {
      return console.warn("Simulator isn't installed on this computer; can't run this test.");
    }

    // Quit the simulator to start the test
    if (await Simulator._isSimulatorRunningAsync()) {
      await Simulator._quitSimulatorAsync();
    }

    await delayAsync(1000); // 1s

    // Open the simulator
    await Simulator._openAndBootSimulatorAsync();

    await delayAsync(9000); // 9s

    // If its not running now, we can't test
    if (!(await Simulator._isSimulatorRunningAsync())) {
      throw new Error(
        "Simulator should be running after being opened, but we're detecting that it isn't."
      );
    }

    // Use a fresh Expo install for this test
    if (await Simulator._isExpoAppInstalledOnCurrentBootedSimulatorAsync()) {
      await Simulator._uninstallExpoAppFromSimulatorAsync();
    }
    if (await Simulator._isExpoAppInstalledOnCurrentBootedSimulatorAsync()) {
      throw new Error("Expo app shouldn't be installed on this simulator but it is");
    }
    await Simulator._installExpoOnSimulatorAsync();
    if (!(await Simulator._isExpoAppInstalledOnCurrentBootedSimulatorAsync())) {
      throw new Error("Expo app should be installed on this simulator but it isn't");
    }

    // Try opening an Expo project, even when it doesn't exists Expo should be open
    await Simulator._openUrlInSimulatorAsync('exp://exp.host/@exponent/fluxpybird');

    await delayAsync(6000); // 6s

    await Simulator._uninstallExpoAppFromSimulatorAsync();
    if (await Simulator._isExpoAppInstalledOnCurrentBootedSimulatorAsync()) {
      throw new Error("Expo app shouldn't be installed on this simulator but it is (2)");
    }

    await Simulator._quitSimulatorAsync();
    if (await Simulator._isSimulatorRunningAsync()) {
      throw new Error("Simulator shouldn't be running but it is");
    }
  });
});
