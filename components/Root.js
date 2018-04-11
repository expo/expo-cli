import React from 'react';
import styled, { hydrate, keyframes, css, injectGlobal } from 'react-emotion';

import * as Constants from 'app/common/constants';

if (typeof window !== 'undefined') {
  hydrate(window.__NEXT_DATA__.ids);
}

injectGlobal`
  html, body, div, span, applet, object, iframe,
  h1, h2, h3, h4, h5, h6, p, blockquote, pre,
  a, abbr, acronym, address, big, cite, code,
  del, dfn, em, img, ins, kbd, q, s, samp,
  small, strike, strong, sub, sup, tt, var,
  b, u, i, center,
  dl, dt, dd, ol, ul, li,
  fieldset, form, label, legend,
  table, caption, tbody, tfoot, thead, tr, th, td,
  article, aside, canvas, details, embed,
  figure, figcaption, footer, header, hgroup,
  menu, nav, output, ruby, section, summary,
  time, mark, audio, video {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    border: 0;
    vertical-align: baseline;
  }

  article, aside, details, figcaption, figure,
  footer, header, hgroup, menu, nav, section {
    display: block;
  }

  @font-face {
    font-family: ${Constants.fontFamilies.bold};
    src: url('/static/fonts/MaisonNeue-Bold.woff2');
    src: url('/static/fonts/MaisonNeue-Bold.woff') format('woff');
  }

  @font-face {
    font-family: ${Constants.fontFamilies.regular};
    src: url('/static/fonts/MaisonNeue-Book.woff2');
    src: url('/static/fonts/MaisonNeue-Book.woff') format('woff');
  }

  @font-face {
    font-family: ${Constants.fontFamilies.demi};
    src: url('/static/fonts/MaisonNeue-Demi.woff2');
    src: url('/static/fonts/MaisonNeue-Demi.woff') format('woff');
  }

  @font-face {
    font-family: ${Constants.fontFamilies.light};
    src: url('/static/fonts/MaisonNeue-Light.woff2');
    src: url('/static/fonts/MaisonNeue-Light.woff') format('woff');
  }

  @font-face {
    font-family: ${Constants.fontFamilies.mono};
    src: url('/static/fonts/MaisonNeue-Mono.woff2');
    src: url('/static/fonts/MaisonNeue-Mono.woff') format('woff');
  }

  html, body {
    height: 100%;
    font-size: 12px;

    ::-webkit-scrollbar {
      width: 0px;
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: ${Constants.colors.appBackground};
    }
  }

  #__next {
    height: 100%
  }

  [data-reactroot] {
    height: 100%;
  }
`;

export default props => <div style={{ height: '100%', ...props.style }}>{props.children}</div>;
