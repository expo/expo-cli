import {
  getGoogleMobileAdsAppId,
  getGoogleMobileAdsAutoInit,
  syncGoogleMobileAdsConfigMetaData,
} from '../GoogleMobileAds';

describe('GoogleMobileAds', () => {
  it(`returns falsey for both if no android google mobileads config is provided`, () => {
    expect(getGoogleMobileAdsAppId({ android: { config: {} } })).toBe(null);
    expect(getGoogleMobileAdsAutoInit({ android: { config: {} } })).toBe(false);
  });

  it(`returns value if android google mobile ads config is provided`, () => {
    expect(
      getGoogleMobileAdsAppId({ android: { config: { googleMobileAdsAppId: 'MY-API-KEY' } } })
    ).toMatch('MY-API-KEY');
    expect(
      getGoogleMobileAdsAutoInit({ android: { config: { googleMobileAdsAutoInit: true } } })
    ).toBe(true);
  });

  describe('syncing', () => {
    it('adds google mobile ads key config to metadata', async () => {
      const metadata = syncGoogleMobileAdsConfigMetaData({
        android: {
          config: { googleMobileAdsAppId: 'MY-API-KEY', googleMobileAdsAutoInit: false },
        },
      });

      expect(metadata).toStrictEqual({
        'com.google.android.gms.ads.APPLICATION_ID': {
          value: 'MY-API-KEY',
        },
        'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT': {
          value: 'true',
        },
      });
    });

    it('removes google mobile ads API key from existing metadata when the expo specific value is missing', async () => {
      const metadata = syncGoogleMobileAdsConfigMetaData({
        android: {
          config: {},
          metadata: {
            'com.google.android.gms.ads.APPLICATION_ID': {
              value: 'MY-API-KEY',
            },
            'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT': {
              value: 'true',
            },
          },
        },
      });

      expect(metadata).toStrictEqual({});
    });
  });
});
