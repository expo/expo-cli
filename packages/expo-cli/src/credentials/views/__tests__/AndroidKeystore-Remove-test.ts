import fs from 'fs-extra';
import { getCtxMock, testExperienceName } from '../../test-fixtures/mocks-android';
import { RemoveKeystore } from '../AndroidKeystore';
import prompt from '../../../prompt';
import { mockExpoXDL } from '../../../__tests__/mock-utils';

jest.mock('../../actions/list');
jest.mock('../../../prompt');
jest.mock('fs-extra');
mockExpoXDL({
  AndroidCredentials: {
    generateUploadKeystore: jest.fn().mockImplementation(() => ({
      keystorePth: 'test',
      keystorePassword: 'test',
      keyAlias: 'test',
      keyPassword: 'test',
    })),
  },
});

const originalWarn = console.warn;
const originalLog = console.log;
beforeAll(() => {
  console.warn = jest.fn();
  console.log = jest.fn();
});
afterAll(() => {
  console.warn = originalWarn;
  console.log = originalLog;
});
beforeEach(() => {
  (prompt as any).mockReset();
  (prompt as any).mockImplementation(() => {
    throw new Error('Should not be called');
  });
});

describe('RemoveKeystore', () => {
  describe('existing credentials', () => {
    it('should display warning prompt and abort', async () => {
      const ctx = getCtxMock();
      (prompt as any)
        .mockImplementationOnce(() => ({ confirm: false })) // prompt with warning message, abort
        .mockImplementationOnce(x => {
          throw new Error("shouldn't happen");
        });

      const view = new RemoveKeystore(testExperienceName);
      const lastView = await view.open(ctx);

      expect(lastView).toBe(null);
      expect((prompt as any).mock.calls.length).toBe(1);
      expect(ctx.android.fetchKeystore.mock.calls.length).toBe(1);
      expect(ctx.android.removeKeystore.mock.calls.length).toBe(0);
    });

    it('should display warning prompt and continue', async () => {
      const ctx = getCtxMock();
      fs.pathExists.mockImplementationOnce(() => false);

      // first: prompt with warning message, true means continue
      // second: ask if cli should display credentials, user won't see that because when() should return false
      (prompt as any)
        .mockImplementationOnce(() => ({ confirm: true }))
        .mockImplementationOnce(question => {
          if (question.when()) {
            throw new Error("shouldn't happen");
          }
          return { confirm: undefined };
        })
        .mockImplementationOnce(() => {
          throw new Error("shouldn't happen");
        });

      const view = new RemoveKeystore(testExperienceName);
      const lastView = await view.open(ctx);

      expect(lastView).toBe(null);
      expect((prompt as any).mock.calls.length).toBe(2);
      expect(ctx.android.fetchKeystore.mock.calls.length).toBe(2);
      expect(ctx.android.removeKeystore.mock.calls.length).toBe(1);
    });
  });

  describe('no credentials', () => {
    it("shouldn't display warning prompt and finish", async () => {
      const ctx = getCtxMock({
        android: {
          fetchKeystore: jest.fn().mockImplementationOnce(() => null),
        },
      });
      (prompt as any).mockImplementationOnce(() => {
        throw new Error("shouldn't happen");
      });

      const view = new RemoveKeystore(testExperienceName);
      const lastView = await view.open(ctx);

      expect(lastView).toBe(null);
      expect((prompt as any).mock.calls.length).toBe(0);
      expect(ctx.android.fetchKeystore.mock.calls.length).toBe(1);
      expect(ctx.android.removeKeystore.mock.calls.length).toBe(0);
    });
  });
});
