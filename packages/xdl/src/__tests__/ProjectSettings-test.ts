import fs from 'fs-extra';
import path from 'path';

import * as ProjectSettings from '../ProjectSettings';

describe('devices info', () => {
  let projectRoot: string;

  beforeAll(() => {
    projectRoot = path.join('/', 'tmp', 'xdl-project-settings');
  });

  afterEach(async () => {
    await ProjectSettings.setDevicesInfoAsync(projectRoot, { devices: [] });
  });

  afterAll(() => {
    if (projectRoot) {
      fs.removeSync(projectRoot);
    }
  });

  it('should persist device info to disk', async () => {
    await ProjectSettings.saveDevicesAsync(projectRoot, 'test-device-id');

    const file = path.join(projectRoot, '.expo', 'devices.json');
    expect(fs.existsSync(file)).toBe(true);

    const { devices } = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(devices.length).toBe(1);
    expect(devices[0].installationId).toBe('test-device-id');
  });

  it('should save an array of devices', async () => {
    await ProjectSettings.saveDevicesAsync(projectRoot, ['device-id-1', 'device-id-2']);
    const { devices } = await ProjectSettings.readDevicesInfoAsync(projectRoot);
    expect(devices.length).toBe(2);
    expect(devices.some(device => device.installationId === 'device-id-1')).toBe(true);
    expect(devices.some(device => device.installationId === 'device-id-2')).toBe(true);
  });

  it('should save at most 10 devices', async () => {
    const deviceIds = [];
    for (let i = 0; i < 11; i++) {
      deviceIds.push(`device-id-${i}`);
    }
    await ProjectSettings.saveDevicesAsync(projectRoot, deviceIds);
    const { devices } = await ProjectSettings.readDevicesInfoAsync(projectRoot);
    expect(devices.length).toBe(10);
  });

  it('should remove older devices if the total number exceeds 10', async () => {
    const currentTime = new Date().getTime();
    const earlierTime = currentTime - 10;
    const earliestTime = currentTime - 20;

    const devicesInfo = [{ installationId: 'oldest-device', lastUsed: earliestTime }];
    for (let i = 0; i < 9; i++) {
      devicesInfo.push({ installationId: `device-id-${i}`, lastUsed: earlierTime });
    }
    await ProjectSettings.setDevicesInfoAsync(projectRoot, {
      devices: devicesInfo,
    });

    await ProjectSettings.saveDevicesAsync(projectRoot, 'newest-device');
    const { devices } = await ProjectSettings.readDevicesInfoAsync(projectRoot);
    expect(devices.length).toBe(10);
    expect(devices[0].installationId).toBe('newest-device');
    expect(devices.some(device => device.installationId === 'oldest-device')).toBe(false);
  });

  it('should remove any devices last used before 30 days ago', async () => {
    const currentTime = new Date().getTime();
    const time30DaysAnd1SecondAgo = currentTime - 30 * 24 * 60 * 60 * 1000 - 1000;
    await ProjectSettings.setDevicesInfoAsync(projectRoot, {
      devices: [{ installationId: 'very-old-device-id', lastUsed: time30DaysAnd1SecondAgo }],
    });
    await ProjectSettings.saveDevicesAsync(projectRoot, 'new-device-id');
    const { devices } = await ProjectSettings.readDevicesInfoAsync(projectRoot);
    expect(devices.length).toBe(1);
    expect(devices[0].installationId).toBe('new-device-id');
  });
});
