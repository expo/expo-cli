import { killAllAsync } from '../apple/utils/ensureSimulatorAppRunningAsync';
import { delayAsync, SimControl, Simulator } from '../internal';

describe.skip('simulator', () => {
  it('opens and loads url in expo', async () => {
    // This tests depends on the simulator, and could take some time to boot
    jest.setTimeout(60000);

    // Determine if we can run this test or not, if simulator isn't available warn and stop
    if (!(await Simulator.isSimulatorInstalledAsync())) {
      return console.warn("Simulator isn't installed on this computer; can't run this test.");
    }

    // Quit the simulator to start the test
    if (await Simulator.isSimulatorBootedAsync()) {
      await killAllAsync();
      await Simulator.closeSimulatorAppAsync();
    }

    await delayAsync(1000); // 1s

    // Open the simulator
    const sim = await Simulator.ensureSimulatorOpenAsync();

    // await delayAsync(9000); // 9s

    // If its not running now, we can't test
    if (!(await Simulator.isSimulatorBootedAsync())) {
      throw new Error(
        "Simulator should be running after being opened, but we're detecting that it isn't."
      );
    }

    // Use a fresh Expo install for this test
    await Simulator.uninstallExpoAppFromSimulatorAsync(sim);
    await Simulator.installExpoOnSimulatorAsync({ simulator: sim });
    if (!(await Simulator.isExpoClientInstalledOnSimulatorAsync(sim))) {
      throw new Error("Expo app should be installed on this simulator but it isn't");
    }

    // Try opening an Expo project, even when it doesn't exists Expo should be open
    await SimControl.openURLAsync({ url: 'exp://exp.host/@exponent/fluxpybird' });

    await delayAsync(6000); // 6s

    await Simulator.uninstallExpoAppFromSimulatorAsync();
    if (await Simulator.isExpoClientInstalledOnSimulatorAsync(sim)) {
      throw new Error("Expo app shouldn't be installed on this simulator but it is (2)");
    }

    await Simulator.closeSimulatorAppAsync();
    if (await Simulator.isSimulatorBootedAsync()) {
      throw new Error("Simulator shouldn't be running but it is");
    }
  });
});
