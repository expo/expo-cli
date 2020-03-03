export default {
  appleTouchIcon: ({ size, href }: any): string =>
    `<link rel="apple-touch-icon" sizes="${size}x${size}" href="${href}">`,
  manifest: ({ href }: any): string => `<link rel="manifest" href="${href}">`,

  favicon: {
    ico: ({ href }: { href: string }) => `<link rel="shortcut icon" href="${href}">`,
    // 16, 32, 48
    png: ({ href, size }: { href: string; size: 16 | 32 | 48 }) =>
      `<link rel="icon" type="image/png" sizes="${size}x${size}" href="${href}">`,
  },
};
