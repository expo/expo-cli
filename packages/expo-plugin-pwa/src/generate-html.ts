export default {
  appleTouchIcon: ({ size, href }: any): string =>
    `<link rel="apple-touch-icon" sizes="${size}x${size}" href="${href}">`,
  manifest: ({ href }: any): string => `<link rel="manifest" href="${href}">`,

  favicon: ({ href }: any) => `<link rel="shortcut icon" href="${href}">`,
  faviconPng: ({ href, size }: any) =>
    `<link rel="icon" type="image/png" sizes="${size}x${size}" href="${href}">`,
};
