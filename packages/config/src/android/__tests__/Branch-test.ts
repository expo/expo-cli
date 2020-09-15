import { getBranchApiKey, syncBranchConfigMetaData } from '../Branch';

describe('Android branch test', () => {
  it(`returns null if no android branch api key is provided`, () => {
    expect(getBranchApiKey({ android: { config: {} } })).toBe(null);
  });

  it(`returns apikey if android branch api key is provided`, () => {
    expect(getBranchApiKey({ android: { config: { branch: { apiKey: 'MY-API-KEY' } } } })).toBe(
      'MY-API-KEY'
    );
  });

  describe('syncing', () => {
    it('adds branch config to metadata', async () => {
      const metadata = await syncBranchConfigMetaData({
        android: { config: { branch: { apiKey: 'MY-API-KEY' } } },
      });

      expect(metadata).toStrictEqual({ 'io.branch.sdk.BranchKey': { value: 'MY-API-KEY' } });
    });

    it('removes branch config from existing metadata when the expo specific value is missing', async () => {
      const metadata = await syncBranchConfigMetaData({
        android: {
          config: {},
          metadata: {
            'io.branch.sdk.BranchKey': {
              value: 'MY-API-KEY',
            },
          },
        },
      });

      expect(metadata).toStrictEqual({});
    });
  });
});
