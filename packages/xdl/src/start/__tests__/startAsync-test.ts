import { ExpoConfig } from '@expo/config-types';

import { UnifiedAnalytics, UserData } from '../../internal';
import { startAsync } from '../startAsync';

jest.mock('../ngrok', () => ({ startTunnelsAsync: jest.fn() }));
jest.mock('../startLegacyReactNativeServerAsync', () => ({
  startReactNativeServerAsync: jest.fn(),
}));
jest.mock('../../DevSession', () => ({ startSession: jest.fn() }));
jest.mock('../../ConnectionStatus', () => ({ isOffline: jest.fn() }));
jest.mock('../startLegacyExpoServerAsync', () => ({
  startExpoServerAsync: jest.fn(),
  stopExpoServerAsync: jest.fn(),
}));

describe('startAsync', () => {
  const mockManifest: ExpoConfig = {
    name: 'Hello',
    slug: 'hello-world',
    owner: 'ownername',
    version: '1.0.0',
    platforms: ['ios'],
  };
  const projectRoot = '/Users/Expo/sometestapp';
  const mockedUserData: UserData = {
    userId: '18shd8732hj-df8989adshj',
    username: 'some-user',
    sessionSecret: 'some-secret',
    appleId: 'some-apple-id',
    currentConnection: 'Username-Password-Authentication',
    developmentCodeSigningId: 'some-code-signing-id',
  };

  jest.mock('../../User', () => ({ getCachedUserDataAsync: async () => mockedUserData }));
  jest.mock('@expo/config', () => ({
    getConfig: () => ({
      exp: mockManifest,
    }),
  }));

  beforeEach(() => {
    UnifiedAnalytics.initializeClient('key', '4.0.0');
  });

  it('tracks start event for the unified client', async () => {
    (UnifiedAnalytics.logEvent as any) = jest.fn();

    await startAsync(projectRoot);

    expect(UnifiedAnalytics.logEvent).toBeCalledWith('action', {
      action: 'expo start',
      organization: mockManifest.owner,
      project: mockManifest.name,
      source: 'expo cli',
      source_version: UnifiedAnalytics.version,
    });
  });
});
