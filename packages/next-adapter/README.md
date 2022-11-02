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

You will also have to [force Next.js to use SWC](https://nextjs.org/docs/messages/swc-disabled) by adding the following to your `next.config.js`:

```js
// next.config.js
module.exports = {
  experimental: {
    forceSwcTransforms: true,
  },
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
  // experimental.transpilePackages is a Next.js +13 feature.
  // older versions can use next-transpile-modules
  experimental: {
    transpilePackages: [
      'react-native-web',
      'expo',
      // Add more React Native / Expo packages here...
    ],
  },
});
```

The fully qualified Next.js config may look like:

```js
const { withExpo } = require('@expo/next-adapter');

/** @type {import('next').NextConfig} */
const nextConfig = withExpo({
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    forceSwcTransforms: true,
    transpilePackages: [
      'react-native-web',
      'expo',
      // Add more React Native / Expo packages here...
    ],
  },
});

module.exports = nextConfig;
```

### React Native Web styling

The package `react-native-web` builds on the assumption of reset CSS styles, here's how you reset styles in Next.js using the `pages/` directory.

<details>
  <summary>Required <code>pages/_document.js</code> file</summary>

```js
import { Children } from 'react';
import Document, { Html, Head, Main, NextScript } from 'next/document';
import { AppRegistry } from 'react-native';

// Follows the setup for react-native-web:
// https://necolas.github.io/react-native-web/docs/setup/#root-element
// Plus additional React Native scroll and text parity styles for various
// browsers.
// Force Next-generated DOM elements to fill their parent's height
const style = `
html, body, #__next {
  -webkit-overflow-scrolling: touch;
}
#__next {
  display: flex;
  flex-direction: column;
  height: 100%;
}
html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}
body {
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
    const styles = [
      <style key="react-native-style" dangerouslySetInnerHTML={{ __html: style }} />,
      getStyleElement(),
    ];
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

## Troubleshooting

### Cannot use import statement outside a module

Figure out which module has the import statement and add it to the `experimental.transpilePackages` option in `next.config.js`:

```js
const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo({
  experimental: {
    transpilePackages: [
      'react-native-web',
      'expo',
      // Add failing package here, and restart the server...
    ],
  },
});
```
