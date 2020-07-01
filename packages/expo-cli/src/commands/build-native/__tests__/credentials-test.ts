import { ensureCredentialsAsync } from '../credentials';
import { CredentialsProvider } from '../../../credentials/provider';
import { CredentialsSource, Workflow } from '../../../easJson';
import prompts from '../../../prompts';

jest.mock('../../../prompts');

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

function crateMockCredentialsProvider({
  hasRemote,
  hasLocal,
  isLocalSynced,
}: any): CredentialsProvider {
  let credentials;
  return {
    hasRemoteAsync: jest.fn().mockImplementation(() => hasRemote || false),
    hasLocalAsync: jest.fn().mockImplementation(() => hasLocal || false),
    useRemoteAsync: jest.fn(),
    useLocalAsync: jest.fn(),
    isLocalSyncedAsync: jest.fn().mockImplementation(() => isLocalSynced || false),
  } as CredentialsProvider;
}

beforeEach(() => {
  (prompts as any).mockReset();
});

describe('ensureCredentialsAsync', () => {
  describe('for generic builds', () => {
    it('should use local if there are only local credentials', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: false,
        hasLocal: true,
      });
      await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO);
      expect(provider.useLocalAsync).toHaveBeenCalled();
    });
    it('should use remote if there are only remote credentials', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: false,
      });
      await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO);
      expect(provider.useRemoteAsync).toHaveBeenCalled();
    });
    it('should use local when local and remote are the same', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: true,
      });
      await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO);
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(provider.useLocalAsync).toHaveBeenCalled();
    });
    it('should ask when local and remote are not the same (select local)', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      (prompts as any).mockImplementation(() => {
        return { select: 'local' };
      });
      await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO);
      expect(prompts).toHaveBeenCalledTimes(1);
      expect(provider.useLocalAsync).toHaveBeenCalledTimes(1);
    });
    it('should ask when local and remote are not the same (select remote)', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      (prompts as any).mockImplementation(() => {
        return { select: 'remote' };
      });
      await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO);
      expect(prompts).toHaveBeenCalledTimes(1);
      expect(provider.useRemoteAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('for managed builds', () => {
    it('should use local if there are only local credentials', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: false,
        hasLocal: true,
      });
      await ensureCredentialsAsync(provider, Workflow.Managed, CredentialsSource.AUTO);
      expect(provider.useLocalAsync).toHaveBeenCalled();
    });
    it('should use remote if there are only remote credentials', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: false,
      });
      await ensureCredentialsAsync(provider, Workflow.Managed, CredentialsSource.AUTO);
      expect(provider.useRemoteAsync).toHaveBeenCalled();
    });
    it('should use local when local and remote are the same', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: true,
      });
      await ensureCredentialsAsync(provider, Workflow.Managed, CredentialsSource.AUTO);
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(provider.useLocalAsync).toHaveBeenCalled();
    });

    it('should use local even if remote have different credentials', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      await ensureCredentialsAsync(provider, Workflow.Managed, CredentialsSource.AUTO);
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(provider.useLocalAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('with credentialsSource set to local', () => {
    it('should use local for generic builds when not synced without asking', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.LOCAL);
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(provider.useLocalAsync).toHaveBeenCalledTimes(1);
    });
    it('should fail when useLocalAsync throws error', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      (provider.useLocalAsync as any).mockImplementation(() => {
        throw new Error('no local credentials');
      });
      const promise = ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.LOCAL);
      expect(promise).rejects.toThrowError();
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(provider.useLocalAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('with credentialsSource set to remote', () => {
    it('should use remote for generic builds when not synced without asking', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.REMOTE);
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(provider.useRemoteAsync).toHaveBeenCalledTimes(1);
    });
    it('should fail when useRemoteAsync throws error', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      (provider.useRemoteAsync as any).mockImplementation(() => {
        throw new Error('no remote credentials');
      });
      const promise = ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.REMOTE);
      expect(promise).rejects.toThrowError();
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(provider.useRemoteAsync).toHaveBeenCalledTimes(1);
    });
  });
});
