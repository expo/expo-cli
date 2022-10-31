<!-- Title -->
<h1 align="center">
👋 Welcome to <br/><code>@expo/next-adapter</code>
</h1>

<p align="center">Next.js plugin for using React Native modules</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@expo/next-adapter">
    <img src="https://flat.badgen.net/npm/dw/@expo/next-adapter" target="_blank" />
  </a>
</p>

---

> ⚠️ **Warning:** Support for Next.js is unofficial and not a first-class Expo feature.

## Setup

### Dependencies

Ensure you have `expo`, `next`, `@expo/next-adapter` installed in your project.

### Transpilation

Configure Next.js to transform language features:

<details>
  <summary>Next.js with swc. (Recommended)</summary>
  
  When using Next.js with SWC, you can configure the `babel.config.js` to only account for native.

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

</details>

<details>
  <summary>Next.js with Babel. (Not recommended)</summary>
  
  Adjust your `babel.config.js` to conditionally add `next/babel` when bundling with Webpack for web.

```js
// babel.config.js
module.exports = function (api) {
  // Detect web usage (this may change in the future if Next.js changes the loader)
  const isWeb = api.caller(
    caller =>
      caller && (caller.name === 'babel-loader' || caller.name === 'next-babel-turbo-loader')
  );
  return {
    presets: [
      // Only use next in the browser, it'll break your native project
      isWeb && require('next/babel'),
      'babel-preset-expo',
    ].filter(Boolean),
  };
};
```

</details>

### Next.js configuration

Add the following to your `next.config.js`:

```js
const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo({
  experimental: {
    transpilePackages: [
      'react-native-web',
      'expo',
      // Add more React Native / Expo packages here...
    ],
  },
});
```

### React Native Web styling

The package `react-native-web` builds on the assumption of reset CSS styles, here's how you reset styles in Next.js using the `pages/` directory.

<details>
  <summary>Required <code>pages/_document.js</code> file</summary>

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

</details>

<details>
  <summary>Required <code>pages/_app.js</code> file</summary>

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

</details>

## Transpiling modules

By default, modules in the React Native ecosystem are not transpiled to run in web browsers. React Native relies on advanced caching in Metro to reload quickly. Next.js uses Webpack, which does not have the same level of caching, so by default, no node modules are transpiled. You will have to manually mark every module you want to transpile with the `experimental.transpilePackages` option in `next.config.js`:

```js
const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo({
  experimental: {
    transpilePackages: [
      'react-native-web',
      'expo',
      // Add more React Native / Expo packages here...
    ],
  },
});
```

## Notice

Using Next.js for the web means you will be bundling with the Next.js Webpack config. This will lead to some core differences in how you develop your app vs your website.
