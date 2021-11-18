import fs from 'fs-extra';

import { mockExpoXDL } from '../../../__tests__/mock-utils';
import { confirmAsync } from '../../../utils/prompts';
import { testExperienceName } from '../../__tests__/fixtures/mocks-constants';
import { getCtxMock } from '../../__tests__/fixtures/mocks-context';
import { RemoveKeystore } from '../AndroidKeystore';

jest.mock('../../actions/list');
jest.mock('../../../utils/prompts');
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

beforeEach(() => {
  (confirmAsync as any).mockReset();
  (confirmAsync as any).mockImplementation(() => {
    throw new Error('Should not be called');
  });
});

describe('RemoveKeystore', () => {
  describe('existing credentials', () => {
    it('should display warning prompt and abort', async () => {
      const ctx = getCtxMock();
      (confirmAsync as any)
        .mockImplementationOnce(() => false) // prompt with warning message, abort
        .mockImplementation(x => {
          throw new Error("shouldn't happen");
        });

      const view = new RemoveKeystore(testExperienceName);
      const lastView = await view.open(ctx);

      expect(lastView).toBe(null);
      expect((confirmAsync as any).mock.calls.length).toBe(1);
      expect(ctx.android.fetchKeystore.mock.calls.length).toBe(1);
      expect(ctx.android.removeKeystore.mock.calls.length).toBe(0);
    });

    it('should display warning prompt and continue', async () => {
      const ctx = getCtxMock();
      fs.pathExists.mockImplementationOnce(() => false);

      // first: prompt with warning message, true means continue
      // second: ask if cli should display credentials, user won't see that because when() should return false
      (confirmAsync as any)
        .mockImplementationOnce(() => true)
        .mockImplementationOnce(question => {
          if (question.when()) {
            throw new Error("shouldn't happen");
          }
          return undefined;
        })
        .mockImplementation(() => {
          throw new Error("shouldn't happen");
        });

      const view = new RemoveKeystore(testExperienceName);
      const lastView = await view.open(ctx);

      expect(lastView).toBe(null);
      expect((confirmAsync as any).mock.calls.length).toBe(1);
      expect(ctx.android.fetchKeystore.mock.calls.length).toBe(2);
      expect(ctx.android.removeKeystore.mock.calls.length).toBe(1);
    });

    it('should not display a prompt in non-interactive mode', async () => {
      const ctx = getCtxMock({ nonInteractive: true });

      // first: prompt with warning message, true means continue
      // second: ask if cli should display credentials, user won't see that because when() should return false
      (confirmAsync as any)
        .mockImplementationOnce(() => true)
        .mockImplementationOnce(question => {
          if (question.when()) {
            throw new Error("shouldn't happen");
          }
          return undefined;
        })
        .mockImplementation(() => {
          throw new Error("shouldn't happen");
        });

      const view = new RemoveKeystore(testExperienceName);

      expect.assertions(2);

      try {
        await view.open(ctx);
      } catch (e) {
        expect(e.message).toMatch('Deleting build credentials is a destructive operation');
      }

      expect(confirmAsync).not.toHaveBeenCalled();
    });
  });

  describe('no credentials', () => {
    it("shouldn't display warning prompt and finish", async () => {
      const ctx = getCtxMock({
        android: {
          fetchKeystore: jest.fn().mockImplementationOnce(() => null),
        },
      });
      (confirmAsync as any).mockImplementation(() => {
        throw new Error("shouldn't happen");
      });

      const view = new RemoveKeystore(testExperienceName);
      const lastView = await view.open(ctx);

      expect(lastView).toBe(null);
      expect((confirmAsync as any).mock.calls.length).toBe(0);
      expect(ctx.android.fetchKeystore.mock.calls.length).toBe(1);
      expect(ctx.android.removeKeystore.mock.calls.length).toBe(0);
    });
  });
});
