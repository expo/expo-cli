/* global workbox, self */

workbox.clientsClaim();

/**
 * Add support for push notification.
 */
self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    // If `event.data.text()` is not a JSON object, we just treat it
    // as a plain string and display it as the body.
    payload = { title: '', body: event.data.text() };
  }

  const title = payload.title;
  const options = {
    body: payload.body,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

workbox.precaching.precacheAndRoute(self.__precacheManifest);
