<!-- Title -->
<h1 align="center">
👋 Welcome to <br/><code>@expo/next-adapter</code>
</h1>

<!-- Header -->

<p align="center">
    <b>The document component for Next.js projects using Unimodules</b>
    <br/>
    <br/>
    <a aria-label="Circle CI" href="https://circleci.com/gh/expo/expo-cli/tree/master">
        <img alt="Circle CI" src="https://flat.badgen.net/circleci/github/expo/expo-cli?label=Circle%20CI&labelColor=555555&icon=circleci">
    </a>
</p>

---

## 🏁 Setup

Install `@expo/next-adapter` in your project.

```sh
yarn add @expo/next-adapter
```

## ⚽️ Usage

0. Bootstrap your project with `Next.js`
1. Re-export this component from the `pages/_document.js` file of your Next.js project.

   `pages/_document.js`

   ```js
   import Document from '@expo/next-adapter/document';

   export default Document;
   ```

1. Create a `babel.config.js` and install the Expo Babel preset:

   `babel.config.js`

   ```js
   module.exports = { presets: ['babel-preset-expo'] };
   ```

1. Start your project with `yarn next dev`

**Adding Expo PWA features**

1. Install `next-offline` to emulate Expo PWA features: `yarn add next-offline` (this is optional)
1. Configure your Next.js project to resolve React Native Unimodules:

   `next.config.js`

   ```js
   const withOffline = require('next-offline');
   const { withExpo } = require('@expo/next-adapter');

   // If you didn't install next-offline, then simply delete this method and the import.
   module.exports = withOffline(
     withExpo({
       workboxOpts: {
         swDest: 'workbox-service-worker.js',
       },
       projectRoot: __dirname,
     })
   );
   ```

1. Create a custom server to host your service worker:
   `server.js`

   ```js
   const { startServerAsync } = require('@expo/next-adapter');

   startServerAsync(/* port: 3000 */);
   ```

1. Copy the Expo service worker into your project's public folder: `cp node_modules/\@expo/next-adapter/workbox-service-worker.js public/workbox-service-worker.js`

1. Start your project with `node server.js`

## Handle server requests

You may want to intercept server requests, this will allow for that:

`server.js`

```js
const { createServerAsync } = require('@expo/next-adapter');

createServerAsync({
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

# Publishing

If you wish to use services such as [ZEIT Now](https://zeit.co/now) to host your website, you should ask the service to run `expo build:web`.

For [ZEIT Now](https://zeit.co/now) specifically, you could simply set `scripts.build` and `scripts.now-build` to `"expo build:web"` in your `package.json` file. Then run `now` to publish. Learn more [here](https://zeit.co/guides/upgrade-to-zero-configuration#frameworks-with-zero-configuration).

```json
{
  "scripts": {
    "build": "expo build:web",
    "now-build": "expo build:web"
  }
}
```

You also export the website as static files by running the following commands. Learn more [here](https://nextjs.org/features/static-exporting).

```
expo build:web
yarn next export
```

### Web push notifications support

With `expo start`, [web push notifications](https://docs.expo.io/versions/latest/guides/push-notifications/) are supported without any additional configuration.

To use it with other services such as ZEIT Now, you would need appropriate configuration to

- let `/service-worker.js` serve the file content of `/static/service-worker.js`, and
- let `/workbox-service-worker.js` serve the file content of a service worker, which be:
  - `/static/workbox-service-worker.js` (which will by default be a blank file) if you do not want to use any other service worker, or
  - `/_next/static/workbox-service-worker.js` if you are using [next-offline](https://github.com/hanford/next-offline), or
  - your own service worker file.

Here is an example `now.json` configuration file:

```jsonc
{
  "version": 2,
  "routes": [
    {
      "src": "/service-worker.js",
      "dest": "/static/service-worker.js",
      "headers": {
        "cache-control": "public, max-age=43200, immutable",
        "Service-Worker-Allowed": "/"
      }
    },
    // If you are using next-offline, change the object below according to their guide.
    {
      "src": "/workbox-service-worker.js",
      "dest": "/static/workbox-service-worker.js",
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
