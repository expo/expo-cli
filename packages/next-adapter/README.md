<!-- Title -->
<h1 align="center">
👋 Welcome to <br/><code>@expo/next-adapter</code>
</h1>

<p align="center">Adapter document and server for Next.js projects using Expo modules.</p>

<p align="center">
  <img src="https://flat.badgen.net/packagephobia/install/@expo/next-adapter">

  <a href="https://www.npmjs.com/package/@expo/next-adapter">
    <img src="https://flat.badgen.net/npm/dw/@expo/next-adapter" target="_blank" />
  </a>

  <a aria-label="Circle CI" href="https://circleci.com/gh/expo/expo-cli/tree/main">
    <img alt="Circle CI" src="https://flat.badgen.net/circleci/github/expo/expo-cli?label=Circle%20CI&labelColor=555555&icon=circleci">
  </a>
</p>

---

> ⚠️ **Warning:** Support for Next.js is experimental. Please open an issue at [expo-cli/issues](https://github.com/expo/expo-cli/issues) if you encountered any problems.

## Documentation

Ensure you have `expo` and `next` installed in your project.

Add the following to your `babel.config.js`:

```js
module.exports = function (api: any) {
  // Detect web usage (this may change in the future if Next.js changes the loader)
  const isWeb = api.caller(
    (caller?: { name: string }) =>
      caller && (caller.name === 'babel-loader' || caller.name === 'next-babel-turbo-loader')
  );
  return {
    presets: [
      // Only use next in the browser, it'll break your native project
      isWeb && require('next/babel'),
      [
        require('babel-preset-expo'),
        {
          web: { useTransformReactJSXExperimental: true },
          // Disable the `no-anonymous-default-export` plugin in babel-preset-expo
          // so users don't see duplicate warnings.
          'no-anonymous-default-export': false,
        },
      ],
    ].filter(Boolean),
  };
};
```

Add the following to your `next.config.js`:

```js
const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo({
  projectRoot: __dirname,
});
```

Create a `pages/_document.js` file:

```js
import { Children } from 'react';
import Document, { Html, Head, Main, NextScript } from 'next/document';
import { AppRegistry } from 'react-native';

// Force Next-generated DOM elements to fill their parent's height
const style = `
html, body, #__next {
  width: 100%;
  /* To smooth any scrolling behavior */
  -webkit-overflow-scrolling: touch;
  margin: 0px;
  padding: 0px;
  /* Allows content to fill the viewport and go beyond the bottom */
  min-height: 100%;
}
#__next {
  flex-shrink: 0;
  flex-basis: auto;
  flex-direction: column;
  flex-grow: 1;
  display: flex;
  flex: 1;
}
html {
  scroll-behavior: smooth;
  /* Prevent text size change on orientation change https://gist.github.com/tfausak/2222823#file-ios-8-web-app-html-L138 */
  -webkit-text-size-adjust: 100%;
  height: 100%;
}
body {
  display: flex;
  /* Allows you to scroll below the viewport; default value is visible */
  overflow-y: auto;
  overscroll-behavior-y: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -ms-overflow-style: scrollbar;
}
`;

export default class MyDocument extends Document {
  static async getInitialProps({ renderPage }) {
    AppRegistry.registerComponent('main', () => Main);
    const { getStyleElement } = AppRegistry.getApplication('main');
    const page = await renderPage();
    const styles = [<style dangerouslySetInnerHTML={{ __html: style }} />, getStyleElement()];
    return { ...page, styles: Children.toArray(styles) };
  }

  render() {
    return (
      <Html style={{ height: '100%' }}>
        <Head />
        <body style={{ height: '100%', overflow: 'hidden' }}>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
```

Create a `pages/_app.js` file:

```js
import * as React from 'react';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
```

Now you can import and use React Native modules in the `pages/` directory.

## Notice

Using Next.js for web means you will be bundling with the Next.js Webpack config. This will lead to some core differences in how you develop your app vs your website.

[docs]: https://docs.expo.dev/guides/using-nextjs/
[nextjs]: https://nextjs.org/
[next-docs]: https://nextjs.org/docs
[custom-document]: https://nextjs.org/docs#custom-document
[next-offline]: https://github.com/hanford/next-offline
[next-pwa]: https://nextjs.org/features/progressive-web-apps
[next-transpile-modules]: https://github.com/martpie/next-transpile-modules
