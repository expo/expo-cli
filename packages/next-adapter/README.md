<!-- Title -->
<h1 align="center">
👋 Welcome to <br/><code>@expo/next-adapter</code>
</h1>

<!-- Header -->

<p align="center">
    <b>Adapter document and server for Next.js projects using Unimodules</b>
    <br/>
    <br/>
    <a aria-label="Circle CI" href="https://circleci.com/gh/expo/expo-cli/tree/master">
        <img alt="Circle CI" src="https://flat.badgen.net/circleci/github/expo/expo-cli?label=Circle%20CI&labelColor=555555&icon=circleci">
    </a>
</p>

---

## 🏁 Setup

### Expo projects using Next

Using SSR in your universal project

- Bootstrap your project with Expo - `expo init`
- Install - `yarn add next @expo/next-adapter`
- Create a front page for your Next project with `cp App.js pages/index.js`

### Next projects using Expo

If you want to use Expo components in your web-only projects

- Bootstrap your project with `Next.js` - `npx create-next-app`
- Install - `yarn add react-native-web @expo/next-adapter && yarn add -D babel-preset-expo`

### Common steps

1. Re-export this component from the `pages/_document.js` file of your Next.js project. (`mkdir pages; touch pages/_document.js`)

   `pages/_document.js`

   ```js
   import Document from '@expo/next-adapter/document';

   export default Document;
   ```

1. Create a `babel.config.js` and install the Expo Babel preset: `yarn add -D babel-preset-expo`

   `babel.config.js`

   ```js
   module.exports = function(api) {
     const isWeb = api.caller(caller => caller && caller.name === 'babel-loader');

     return {
       presets: [
         'babel-preset-expo',
         // Only use next in the browser
         isWeb && 'next/babel',
       ].filter(Boolean),
     };
   };
   ```

1. Update the Next.js config file to support loading React Native and Expo packages:
   `next.config.js`

   ```js
   const { withExpo } = require('@expo/next-adapter');

   module.exports = withExpo({
     projectRoot: __dirname,
   });
   ```

1. Start your project with `yarn next dev` or `yarn dev`

**Adding Expo PWA features**

1. Install `next-offline` to emulate Expo PWA features: `yarn add next-offline` (this is optional)
1. Configure your Next.js project to resolve React Native Unimodules:

   `next.config.js`

   ```js
   const withOffline = require('next-offline');
   const { withExpo } = require('@expo/next-adapter');

   // If you didn't install next-offline, then simply delete this method and the import.
   module.exports = withOffline({
     workboxOpts: {
       swDest: 'workbox-service-worker.js',

       /* changing any value means you'll have to copy over all the defaults  */
       /* next-offline */
       globPatterns: ['static/**/*'],
       globDirectory: '.',
       runtimeCaching: [
         {
           urlPattern: /^https?.*/,
           handler: 'NetworkFirst',
           options: {
             cacheName: 'offlineCache',
             expiration: {
               maxEntries: 200,
             },
           },
         },
       ],
     },
     ...withExpo({
       projectRoot: __dirname,
     }),
   });
   ```

1. You can now test your project in production mode using the following: `yarn next build && yarn next export && serve -p 3000 ./out`

**Using a custom server**

1. Create a custom server to host your service worker:
   `server.js`

   ```js
   const { startServerAsync } = require('@expo/next-adapter');

   startServerAsync(__dirname, {
     /* port: 3000 */
   });
   ```

1. Copy the Expo service worker into your project's public folder: `mkdir public; cp node_modules/\@expo/next-adapter/service-worker.js public/service-worker.js`

1. Start your project with `node server.js`

## Handle server requests

You may want to intercept server requests, this will allow for that:

`server.js`

```js
const { createServerAsync } = require('@expo/next-adapter');

createServerAsync(projectRoot, {
  handleRequest(res, req) {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // handle GET request to /cool-file.png
    if (pathname === '/cool-file.png') {
      const filePath = join(__dirname, '.next', pathname);

      app.serveStatic(req, res, filePath);
      // Return true to prevent the default handler
      return true;
    }
  },
}).then(({ server, app }) => {
  const port = 3000;

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
```

### Web push notifications support

With `expo start`, [web push notifications](https://docs.expo.io/versions/latest/guides/push-notifications/) are supported without any additional configuration.

To use it with other services such as ZEIT Now, you would need appropriate configuration to

- let `/service-worker.js` serve the file content of `/public/service-worker.js`, and
- let `/workbox-service-worker.js` serve the file content of a service worker, which be:
  - `/public/workbox-service-worker.js` (which will by default be a blank file) if you do not want to use any other service worker, or
  - `/_next/public/workbox-service-worker.js` if you are using [next-offline](https://github.com/hanford/next-offline), or
  - your own service worker file.

Here is an example `now.json` configuration file:

```jsonc
{
  "version": 2,
  "routes": [
    {
      "src": "/service-worker.js",
      "dest": "/public/service-worker.js",
      "headers": {
        "cache-control": "public, max-age=43200, immutable",
        "Service-Worker-Allowed": "/"
      }
    },
    // If you are using next-offline, change the object below according to their guide.
    {
      "src": "/workbox-service-worker.js",
      "dest": "/public/workbox-service-worker.js",
      "headers": {
        "cache-control": "public, max-age=43200, immutable",
        "Service-Worker-Allowed": "/"
      }
    }
  ]
}
```

### Customizing `pages/_document.js`

Next.js uses the `pages/_document.js` file to augment your app's `<html>` and `<body>` tags. Learn more [here](https://nextjs.org/docs#custom-document).

You can import the following fragments from the custom Document:

```js
import { Document, getInitialProps, style } from '@expo/next-adapter/document';
```

Then recompose the Document how you like

```js
import { getInitialProps } from '@expo/next-adapter/document';
import Document, { Head, Main, NextScript } from 'next/document';
import React from 'react';

class CustomDocument extends Document {
  render() {
    return (
      <html>
        <Head>
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </html>
    );
  }
}

// Import the getInitialProps method and assign it to your component
CustomDocument.getInitialProps = getInitialProps;

// OR...

CustomDocument.getInitialProps = async props => {
  const result = await getInitialProps(props);
  // Mutate result...
  return result;
};

export default CustomDocument;
```

## Limitations or differences comparing to the default Expo for Web

- Unlike the default Expo for Web, Workbox and PWA are not supported by default. Use Next.js plugins such as [next-offline](https://github.com/hanford/next-offline) instead. Learn more [here](https://nextjs.org/features/progressive-web-apps).
- You might need to use the [next-transpile-modules](https://github.com/martpie/next-transpile-modules) plugin to transpile certain third-party modules in order for them to work (such as Emotion).
- Only the Next.js default page-based routing is supported.

## Learn more about Next.js

Learn more about how to use Next.js from their [docs](https://nextjs.org/docs).

## License

The Expo source code is made available under the [MIT license](LICENSE). Some of the dependencies are licensed differently, with the BSD license, for example.

<!-- Footer -->

---

<p>
    <a aria-label="sponsored by expo" href="http://expo.io">
        <img src="https://img.shields.io/badge/Sponsored_by-Expo-4630EB.svg?style=for-the-badge&logo=EXPO&labelColor=000&logoColor=fff" target="_blank" />
    </a>
    <a aria-label="expo next-adapter is free to use" href="/LICENSE" target="_blank">
        <img align="right" alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=for-the-badge&color=33CC12" target="_blank" />
    </a>
</p>
