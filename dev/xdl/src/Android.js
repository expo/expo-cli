import 'instapromise';

import { exec } from 'child_process';
import spawnAsync from '@exponent/spawn-async';

let options = {
  cwd: __dirname + '/../',
};

async function isDeviceAttached() {
  let devices = await exec.promise("./adb devices | awk '!/List of devices/ && NF' | wc -l", options);
  return parseInt(devices) > 0;
}

async function isExponentInstalledAsync() {
  let numberOfExponentApps = await exec.promise("./adb shell 'pm list packages -f' | grep 'host.exp.exponent' | wc -l", options);
  return parseInt(numberOfExponentApps) > 0;
}

async function playStoreAsync() {
  return await openUrlAsync('market://details?id=host.exp.exponent');
}

async function openUrlAsync(url) {
  return await spawnAsync('./adb', ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url], options);
}

async function openUrlSafeAsync(url, log, error) {
  if (!(await isDeviceAttached())) {
    error("No Android device found. Please connect a device or try restarting ADB");
    return;
  }

  if (!(await isExponentInstalledAsync())) {
    error("No Exponent app found on Android device. Opening Play Store page for Exponent");
    await playStoreAsync();
    return;
  }

  log("Opening on Android device");
  await openUrlAsync(url);
}

module.exports = {
  isDeviceAttached,
  isExponentInstalledAsync,
  openUrlAsync,
  openUrlSafeAsync,
  playStoreAsync,
};
