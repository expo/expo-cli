import { enableWithPropertyOrConfig, overrideWithPropertyOrConfig } from '../config';

it(`returns config`, async () => {
  expect(
    enableWithPropertyOrConfig(true, {
      navigateFallback: '/index.html',
      offlineGoogleAnalytics: false,
      clientsClaim: true,
    })
  ).toMatchObject({
    navigateFallback: '/index.html',
    offlineGoogleAnalytics: false,
    clientsClaim: true,
  });
});

it(`returns overridden config`, async () => {
  expect(
    enableWithPropertyOrConfig(
      {
        navigateFallback: '/root.html',
        offlineGoogleAnalytics: false,
      },
      {
        navigateFallback: '/index.html',
        offlineGoogleAnalytics: false,
        clientsClaim: true,
      }
    )
  ).toMatchObject({
    navigateFallback: '/root.html',
    offlineGoogleAnalytics: false,
  });
});

it(`returns merged config`, async () => {
  expect(
    enableWithPropertyOrConfig(
      {
        navigateFallback: '/root.html',
        offlineGoogleAnalytics: false,
      },
      {
        navigateFallback: '/root.html',
        offlineGoogleAnalytics: false,
        clientsClaim: true,
      },
      true
    )
  ).toMatchObject({
    navigateFallback: '/root.html',
    offlineGoogleAnalytics: false,
    clientsClaim: true,
  });
});

it(`returns default config`, async () => {
  expect(
    overrideWithPropertyOrConfig(
      undefined,
      {
        navigateFallback: '/root.html',
        offlineGoogleAnalytics: false,
        clientsClaim: true,
      },
      true
    )
  ).toMatchObject({
    navigateFallback: '/root.html',
    offlineGoogleAnalytics: false,
    clientsClaim: true,
  });
});
