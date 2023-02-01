import spawnAsync from '@expo/spawn-async';

import { InstalledDependencyVersionCheck } from '../InstalledDependencyVersionCheck';

const asMock = <T extends (...args: any[]) => any>(fn: T): jest.MockedFunction<T> =>
  fn as jest.MockedFunction<T>;

describe(InstalledDependencyVersionCheck, () => {
  let check;
  beforeEach(() => {
    check = new InstalledDependencyVersionCheck();
  });
  describe('runAsync', () => {
    it('returns result with isSuccessful = true if check passes', async () => {
      asMock(spawnAsync).mockResolvedValueOnce({
        stdout: '',
      } as any);
      const result = await check.runAsync({ projectRoot: '/path/to/project' });
      expect(result.isSuccessful).toBeTruthy();
    });

    it('calls npx expo install --check', async () => {
      const mockSpawnAsync = asMock(spawnAsync).mockResolvedValueOnce({
        stdout: '',
      } as any);
      await check.runAsync({ projectRoot: '/path/to/project' });
      expect(mockSpawnAsync.mock.calls[0][0]).toBe('sh');
      expect(mockSpawnAsync.mock.calls[0][1]).toEqual([
        '-c',
        'echo "n" | npx expo install --check',
      ]);
    });

    it('returns result with isSuccessful = false if check fails', async () => {
      asMock(spawnAsync).mockImplementationOnce(() => {
        const error: any = new Error();
        error.stderr = 'error';
        error.stdout = '';
        error.status = 1;
        throw error;
      });
      const result = await check.runAsync({ projectRoot: '/path/to/project' });
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
      const result = await check.runAsync({ projectRoot: '/path/to/project' });
      expect(result.issues).toEqual(['error']);
    });
  });
});
