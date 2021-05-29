import commandExists from 'command-exists';

import { testExperienceName } from '../../__tests__/fixtures/mocks-constants';
import { getCtxMock } from '../../__tests__/fixtures/mocks-context';
import { UpdateKeystore } from '../AndroidKeystore';
import { SetupAndroidKeystore } from '../SetupAndroidKeystore';

jest.mock('../../actions/list');
jest.mock('command-exists');

(commandExists as any).mockImplementation(() => {
  return true;
});

beforeEach(() => {});

describe('SetupAndroidKeystore', () => {
  describe('has valid credentials', () => {
    it('should check credentials and exit', async () => {
      const ctx = getCtxMock();
      const view = new SetupAndroidKeystore(testExperienceName, {});
      const lastView = await view.open(ctx);

      expect(lastView).toBe(null);
      expect(ctx.android.fetchKeystore.mock.calls.length).toBe(1);
      expect(ctx.android.updateKeystore.mock.calls.length).toBe(0);
    });
  });

  describe('no credentials', () => {
    it('should check credentials and launch UpdateKeystore view', async () => {
      const ctx = getCtxMock({
        android: {
          fetchKeystore: jest.fn().mockImplementationOnce(() => null),
        },
      });

      const view = new SetupAndroidKeystore(testExperienceName, {});
      const updateView = await view.open(ctx);

      expect(updateView).toBeInstanceOf(UpdateKeystore);
      expect(ctx.android.fetchKeystore.mock.calls.length).toBe(1);
    });
  });

  describe('when non interactive', () => {
    it('should succeed if allowMissingKeystore is true', async () => {
      const ctx = getCtxMock({
        android: {
          fetchKeystore: jest.fn().mockImplementationOnce(() => null),
        },
      });

      const view = new SetupAndroidKeystore(testExperienceName, {
        nonInteractive: true,
        allowMissingKeystore: true,
      });
      const lastView = await view.open(ctx);

      expect(lastView).toBe(null);
      expect(ctx.android.fetchKeystore.mock.calls.length).toBe(1);
      expect(ctx.android.updateKeystore.mock.calls.length).toBe(0);
    });
    it('should fail if credentials are missing', async () => {
      const ctx = getCtxMock({
        android: {
          fetchKeystore: jest.fn().mockImplementationOnce(() => null),
        },
      });

      const view = new SetupAndroidKeystore(testExperienceName, { nonInteractive: true });

      expect(view.open(ctx)).rejects.toThrow();

      expect(ctx.android.fetchKeystore.mock.calls.length).toBe(1);
    });
  });
});
