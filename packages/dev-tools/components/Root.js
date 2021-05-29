import * as Constants from 'app/common/constants';
import GlobalToasts from 'app/components/GlobalToasts';
import React from 'react';
import { hydrate, injectGlobal } from 'react-emotion';

if (typeof window !== 'undefined') {
  hydrate(window.__NEXT_DATA__.ids);
}

// eslint-disable-next-line @babel/no-unused-expressions
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

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes fadeInRight {
    from {
      opacity: 0;
      transform: translate3d(100%, 0, 0);
    }

    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
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
    src: url('/static/fonts/MaisonNeueMono-Regular.woff2');
    src: url('/static/fonts/MaisonNeueMono-Regular.woff') format('woff');
  }

  html, body {
    height: 100%;
    font-size: 12px;
    background: ${Constants.colors.black};

    ::-webkit-scrollbar {
      width: 0px;
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: ${Constants.colors.black};
    }
  }

  #__next {
    height: 100%
  }

  [data-reactroot] {
    height: 100%;
  }
`;

export default props => (
  <div style={{ height: '100%', position: 'relative', ...props.style }}>
    {props.children}
    <GlobalToasts />
  </div>
);
