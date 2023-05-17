import spawnAsync from '@expo/spawn-async';

import { asMock } from '../../__tests__/asMock';
import { isWindowsShell } from '../../utils/windows';
import { InstalledDependencyVersionCheck } from '../InstalledDependencyVersionCheck';

jest.mock(`../../utils/windows`);

// required by runAsync
const additionalProjectProps = {
  exp: {
    name: 'name',
    slug: 'slug',
  },
  pkg: {},
};

describe('runAsync', () => {
  it('returns result with isSuccessful = true if check passes', async () => {
    asMock(spawnAsync).mockResolvedValueOnce({
      stdout: '',
    } as any);
    const check = new InstalledDependencyVersionCheck();
    const result = await check.runAsync({
      projectRoot: '/path/to/project',
      ...additionalProjectProps,
    });
    expect(result.isSuccessful).toBeTruthy();
  });

  it('when not running on Windows, uses sh to call npx expo start', async () => {
    asMock(isWindowsShell).mockReturnValueOnce(false);
    const mockSpawnAsync = asMock(spawnAsync).mockResolvedValueOnce({
      stdout: '',
    } as any);
    const check = new InstalledDependencyVersionCheck();
    await check.runAsync({ projectRoot: '/path/to/project', ...additionalProjectProps });
    expect(mockSpawnAsync.mock.calls[0][0]).toBe('sh');
  });

  it('when running on Windows, uses powershell to call npx expo start', async () => {
    asMock(isWindowsShell).mockReturnValueOnce(true);
    const mockSpawnAsync = asMock(spawnAsync).mockResolvedValueOnce({
      stdout: '',
    } as any);
    const check = new InstalledDependencyVersionCheck();
    await check.runAsync({ projectRoot: '/path/to/project', ...additionalProjectProps });
    expect(mockSpawnAsync.mock.calls[0][0]).toBe('powershell');
  });

  it('calls npx expo install --check', async () => {
    const mockSpawnAsync = asMock(spawnAsync).mockResolvedValueOnce({
      stdout: '',
    } as any);
    const check = new InstalledDependencyVersionCheck();
    await check.runAsync({ projectRoot: '/path/to/project', ...additionalProjectProps });
    expect(mockSpawnAsync.mock.calls[0][0]).toBe('sh');
    expect(mockSpawnAsync.mock.calls[0][1]).toEqual(['-c', 'echo "n" | npx expo install --check']);
  });

  it('returns result with isSuccessful = false if check fails', async () => {
    asMock(spawnAsync).mockImplementationOnce(() => {
      const error: any = new Error();
      error.stderr = 'error';
      error.stdout = '';
      error.status = 1;
      throw error;
    });
    const check = new InstalledDependencyVersionCheck();
    const result = await check.runAsync({
      projectRoot: '/path/to/project',
      ...additionalProjectProps,
    });
    expect(result.isSuccessful).toBeFalsy();
  });

  it('pushes npx expo install --check stderr to issues list', async () => {
    asMock(spawnAsync).mockImplementationOnce(() => {
      const error: any = new Error();
      error.stderr = 'error';
      error.stdout = '';
      error.status = 1;
      throw error;
    });
    const check = new InstalledDependencyVersionCheck();
    const result = await check.runAsync({
      projectRoot: '/path/to/project',
      ...additionalProjectProps,
    });
    expect(result.issues).toEqual(['error']);
  });
});
