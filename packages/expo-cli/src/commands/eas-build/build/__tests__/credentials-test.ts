import { CredentialsProvider } from '../../../../credentials/provider';
import { CredentialsSource, Workflow } from '../../../../easJson';
import prompts from '../../../../prompts';
import { ensureCredentialsAsync } from '../credentials';

jest.mock('../../../../prompts');

function createMockCredentialsProvider({
  hasRemote,
  hasLocal,
  isLocalSynced,
}: any): CredentialsProvider {
  return {
    platform: 'android',
    hasRemoteAsync: jest.fn().mockImplementation(() => hasRemote || false),
    hasLocalAsync: jest.fn().mockImplementation(() => hasLocal || false),
    isLocalSyncedAsync: jest.fn().mockImplementation(() => isLocalSynced || false),
  } as CredentialsProvider;
}

beforeEach(() => {
  (prompts as any).mockReset();
});

describe('ensureCredentialsAsync', () => {
  describe('for generic builds', () => {
    it('should use local if there are only local credentials', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: false,
        hasLocal: true,
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Generic,
        CredentialsSource.AUTO,
        false
      );
      expect(src).toBe('local');
    });
    it('should use remote if there are only remote credentials', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: true,
        hasLocal: false,
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Generic,
        CredentialsSource.AUTO,
        false
      );
      expect(src).toBe('remote');
    });
    it('should use local when local and remote are the same', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: true,
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Generic,
        CredentialsSource.AUTO,
        false
      );
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(src).toBe('local');
    });
    it('should ask when local and remote are not the same (select local)', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      (prompts as any).mockImplementation(() => {
        return { select: 'local' };
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Generic,
        CredentialsSource.AUTO,
        false
      );
      expect(prompts).toHaveBeenCalledTimes(1);
      expect(src).toBe('local');
    });
    it('should ask when local and remote are not the same (select remote)', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      (prompts as any).mockImplementation(() => {
        return { select: 'remote' };
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Generic,
        CredentialsSource.AUTO,
        false
      );
      expect(prompts).toHaveBeenCalledTimes(1);
      expect(src).toBe('remote');
    });
    it('should should throw an error when local and remote are not the same (non interactive)', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });

      expect.assertions(2);

      try {
        await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO, true);
      } catch (e) {
        expect(e.message).toMatch(
          'Contents of your local credentials.json for Android are not the same as credentials on Expo servers'
        );
      }

      expect(prompts).toHaveBeenCalledTimes(0);
    });
    it('should ask when local or remote are not present (confirm)', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: false,
        hasLocal: false,
        isLocalSynced: false,
      });
      (prompts as any).mockImplementation(() => {
        return { confirm: true };
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Generic,
        CredentialsSource.AUTO,
        false
      );
      expect(prompts).toHaveBeenCalledTimes(1);
      expect(src).toBe('remote');
    });
    it('should ask when local or remote are not present (not confirm)', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: false,
        hasLocal: false,
        isLocalSynced: false,
      });
      (prompts as any).mockImplementation(() => {
        return { confirm: false };
      });
      expect.assertions(2);

      try {
        await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO, false);
      } catch (e) {
        expect(e.message).toMatch(
          'Aborting build process, credentials are not configured for Android'
        );
      }

      expect(prompts).toHaveBeenCalledTimes(1);
    });
    it('should throw an error when local or remote are not present (non interactive)', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: false,
        hasLocal: false,
        isLocalSynced: false,
      });
      (prompts as any).mockImplementation(() => {
        return { confirm: true };
      });

      expect.assertions(2);

      try {
        await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO, true);
      } catch (e) {
        expect(e.message).toMatch('Credentials for this app are not configured');
      }

      expect(prompts).toHaveBeenCalledTimes(0);
    });
  });

  describe('for managed builds', () => {
    it('should use local if there are only local credentials', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: false,
        hasLocal: true,
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Managed,
        CredentialsSource.AUTO,
        false
      );
      expect(src).toBe('local');
    });
    it('should use remote if there are only remote credentials', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: true,
        hasLocal: false,
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Managed,
        CredentialsSource.AUTO,
        false
      );
      expect(src).toBe('remote');
    });
    it('should use local when local and remote are the same', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: true,
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Managed,
        CredentialsSource.AUTO,
        false
      );
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(src).toBe('local');
    });

    it('should use local even if remote have different credentials', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Managed,
        CredentialsSource.AUTO,
        false
      );
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(src).toBe('local');
    });
  });

  describe('with credentialsSource set to local', () => {
    it('should use local for generic builds when not synced without asking', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Generic,
        CredentialsSource.LOCAL,
        false
      );
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(src).toBe('local');
    });
  });

  describe('with credentialsSource set to remote', () => {
    it('should use remote for generic builds when not synced without asking', async () => {
      const provider = createMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Generic,
        CredentialsSource.REMOTE,
        false
      );
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(src).toBe('remote');
    });
  });
});
