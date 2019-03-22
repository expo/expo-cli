module.exports = {
  // Facebook
  openGraph: [
    // <link rel="canonical" href="absolute-path">
    // https://developers.facebook.com/docs/sharing/opengraph#types
    { tag: 'meta', name: 'og:type', propNames: ['type'], fallback: 'website' },
    { tag: 'meta', name: 'og:title', propNames: ['title'] },
    { tag: 'meta', name: 'og:site_name', propNames: ['siteName'] },
    { tag: 'meta', name: 'og:description', propNames: ['description'] },
    { tag: 'meta', name: 'article:author', propNames: ['author'] },
    { tag: 'meta', name: 'og:image', propNames: ['image'] },
    { tag: 'meta', name: 'og:image:width', propNames: ['imageWidth'] },
    { tag: 'meta', name: 'og:image:height', propNames: ['imageHeight'] },
    { tag: 'meta', name: 'og:locale', propNames: ['locale'] },
    { tag: 'meta', name: 'og:url', propNames: ['url'] },
  ],
  twitter: [
    { tag: 'meta', name: 'twitter:card', propNames: ['card'] },
    { tag: 'meta', name: 'twitter:title', propNames: ['title'] },
    { tag: 'meta', name: 'twitter:description', propNames: ['description'] },
    { tag: 'meta', name: 'twitter:site', propNames: ['site'] },
    { tag: 'meta', name: 'twitter:image', propNames: ['image'] },
    { tag: 'meta', name: 'twitter:creator', propNames: ['creator'] },
  ],
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
