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
    data: payload.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// https://developer.mozilla.org/en-US/docs/Web/API/Clients
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    (async function() {
      const allClients = await self.clients.matchAll({
        includeUncontrolled: true,
      });

      let appClient;

      // Let's see if we already have a window open:
      for (const client of allClients) {
        const url = new URL(client.url);

        if (url.pathname === '/') {
          // Excellent, let's use it!
          client.focus();
          appClient = client;
          break;
        }
      }

      // If we didn't find an existing window,
      // open a new one:
      if (!appClient) {
        appClient = await self.clients.openWindow('/');
      }

      // Message the client:
      appClient.postMessage(event.notification.data);
    })()
  );
});

workbox.precaching.precacheAndRoute(self.__precacheManifest);
