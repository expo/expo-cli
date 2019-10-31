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

Re-export this component from the `pages/_document.js` file of your Next.js project.

```js
// pages/_document.js
import { Document } from '@expo/next-adapter';

export default Document;
```

## Customizing the Document

You can import the following fragments from the custom Document:

```js
import { Document, getInitialProps, style } from '@expo/next-adapter';
```

Then recompose the Document how you like

```js
import { getInitialProps } from '@expo/next-adapter';
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
