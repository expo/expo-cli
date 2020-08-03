import { CredentialsProvider } from '../../../credentials/provider';
import { CredentialsSource, Workflow } from '../../../easJson';
import prompts from '../../../prompts';
import { ensureCredentialsAsync } from '../credentials';

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
      const provider = crateMockCredentialsProvider({
        hasRemote: false,
        hasLocal: true,
      });
      const src = await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO);
      expect(src).toBe('local');
    });
    it('should use remote if there are only remote credentials', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: false,
      });
      const src = await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO);
      expect(src).toBe('remote');
    });
    it('should use local when local and remote are the same', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: true,
      });
      const src = await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO);
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(src).toBe('local');
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
      const src = await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO);
      expect(prompts).toHaveBeenCalledTimes(1);
      expect(src).toBe('local');
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
      const src = await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.AUTO);
      expect(prompts).toHaveBeenCalledTimes(1);
      expect(src).toBe('remote');
    });
  });

  describe('for managed builds', () => {
    it('should use local if there are only local credentials', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: false,
        hasLocal: true,
      });
      const src = await ensureCredentialsAsync(provider, Workflow.Managed, CredentialsSource.AUTO);
      expect(src).toBe('local');
    });
    it('should use remote if there are only remote credentials', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: false,
      });
      const src = await ensureCredentialsAsync(provider, Workflow.Managed, CredentialsSource.AUTO);
      expect(src).toBe('remote');
    });
    it('should use local when local and remote are the same', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: true,
      });
      const src = await ensureCredentialsAsync(provider, Workflow.Managed, CredentialsSource.AUTO);
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(src).toBe('local');
    });

    it('should use local even if remote have different credentials', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      const src = await ensureCredentialsAsync(provider, Workflow.Managed, CredentialsSource.AUTO);
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(src).toBe('local');
    });
  });

  describe('with credentialsSource set to local', () => {
    it('should use local for generic builds when not synced without asking', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      const src = await ensureCredentialsAsync(provider, Workflow.Generic, CredentialsSource.LOCAL);
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(src).toBe('local');
    });
  });

  describe('with credentialsSource set to remote', () => {
    it('should use remote for generic builds when not synced without asking', async () => {
      const provider = crateMockCredentialsProvider({
        hasRemote: true,
        hasLocal: true,
        isLocalSynced: false,
      });
      const src = await ensureCredentialsAsync(
        provider,
        Workflow.Generic,
        CredentialsSource.REMOTE
      );
      expect(prompts).toHaveBeenCalledTimes(0);
      expect(src).toBe('remote');
    });
  });
});
