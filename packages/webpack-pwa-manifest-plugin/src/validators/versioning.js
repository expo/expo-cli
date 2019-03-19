const deprecated = {
  useWebpackPublicPath: 'https://github.com/arthurbergmz/webpack-pwa-manifest/issues/12',
};

export default function(options, ...properties) {
  for (const property of properties) {
    if (options[property]) {
      console.log(`"${property}" is a deprecated option. Read more at "${deprecated[property]}".`);
    }
  }
}
