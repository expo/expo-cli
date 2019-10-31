export default {
  openGraph: [],
  twitter: [],
  microsoft: [
    // 'msapplication-window': `width=${microsoft.width};height=${microsoft.height}`,
    { tag: 'meta', name: 'mssmarttagspreventparsing', propNames: ['preventParsing'] },
    { tag: 'meta', name: 'msapplication-navbutton-color', propNames: ['buttonColor'] },
    { tag: 'meta', name: 'application-name', propNames: ['appName'] },
    { tag: 'meta', name: 'msapplication-tooltip', propNames: ['tooltip'] },
    { tag: 'meta', name: 'msapplication-TileColor', propNames: ['tileColor'] },
    { tag: 'meta', name: 'msapplication-TileImage', propNames: ['tileImage'] },
  ],
};
