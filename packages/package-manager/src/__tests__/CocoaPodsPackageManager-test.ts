/* eslint-env jest */
import os from 'os';
import path from 'path';
import { CocoaPodsPackageManager } from '../CocoaPodsPackageManager';

const projectRoot = getTemporaryPath();

function getTemporaryPath() {
  return path.join(
    os.tmpdir(),
    Math.random()
      .toString(36)
      .substring(2)
  );
}

it(`throws for unimplemented methods`, async () => {
  const manager = new CocoaPodsPackageManager({ cwd: projectRoot });

  expect(manager.addAsync()).rejects.toThrow('Unimplemented');
  expect(manager.addDevAsync()).rejects.toThrow('Unimplemented');
  expect(manager.getConfigAsync('')).rejects.toThrow('Unimplemented');
  expect(manager.removeLockfileAsync()).rejects.toThrow('Unimplemented');
  expect(manager.cleanAsync()).rejects.toThrow('Unimplemented');
});
