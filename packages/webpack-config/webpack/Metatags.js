module.exports = {
  // Facebook
  openGraph: [
    // <link rel="canonical" href="absolute-path">
    { name: 'og:title', propNames: ['title'] },
    { name: 'og:site_name', propNames: ['siteName'] },
    { name: 'og:description', propNames: ['description'] },
    { name: 'article:author', propNames: ['author'] },
    { name: 'og:image', propNames: ['image'] },
    { name: 'og:image:width', propNames: ['imageWidth'] },
    { name: 'og:image:height', propNames: ['imageHeight'] },
    { name: 'og:locale', propNames: ['locale'] },
    // https://developers.facebook.com/docs/sharing/opengraph#types
    { name: 'og:type', propNames: ['type'], fallback: 'website' },
    { name: 'og:url', propNames: ['url'] },
  ],
  twitter: [
    { name: 'twitter:card', propNames: ['card'] },
    { name: 'twitter:title', propNames: ['title'] },
    { name: 'twitter:description', propNames: ['description'] },
    { name: 'twitter:site', propNames: ['site'] },
    { name: 'twitter:image', propNames: ['image'] },
    { name: 'twitter:creator', propNames: ['creator'] },
  ],
  microsoft: [
    // 'msapplication-window': `width=${microsoft.width};height=${microsoft.height}`,
    { name: 'mssmarttagspreventparsing', propNames: ['preventParsing'] },
    { name: 'msapplication-navbutton-color', propNames: ['buttonColor'] },
    { name: 'application-name', propNames: ['appName'] },
    { name: 'msapplication-tooltip', propNames: ['tooltip'] },
    { name: 'msapplication-TileColor', propNames: ['tileColor'] },
    { name: 'msapplication-TileImage', propNames: ['tileImage'] },
  ],
};
