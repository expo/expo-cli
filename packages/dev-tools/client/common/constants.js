export const colors = {
  white: '#FFFFFF',
  sidebarBackground: 'rgb(246, 246, 246)',
  black: '#111111',
  border: '#ececec',
  darkBorder: '#777777',
  darkInputColor: '#acacac',
  foreground: '#222222',
  foregroundAccent: '#333333',
  foregroundHover: '#444444',
  darkText: '#999999',
  darkTextActive: '#666666',
  logContext: '#777777',
  logTimestamp: '#555555',
  primary: '#4630EB',
  primaryAccent: '#5844ed',
  green: '#00C851',
  yellow: '#ffc107',
  red: '#CC0000',
};

export const fontFamilies = {
  bold: 'bold',
  light: 'light',
  demi: 'demi',
  mono: 'mono',
  regular: 'regular',
};

export const logLevel = {
  DEBUG: colors.white,
  INFO: colors.white,
  WARN: colors.yellow,
  ERROR: colors.red,
};

// https://github.com/IonicaBizau/anser/blob/15a0c888382d7a9681ffe85fd4741ff1a5cd60f4/lib/index.js#L5
export const ansiColorOverrides = {
  '0, 0, 0': colors.black,
  '187, 0, 0': colors.red,
  '0, 187, 0': colors.green,
  '187, 187, 0': colors.yellow,
  '0, 0, 187': undefined, // blue
  '187, 0, 187': undefined, // magenta
  '0, 187, 187': undefined, // cyan
  '255,255,255': colors.white,
};

export const logLevelWithAlpha = {
  DEUBG: 'rgba(255, 255, 255, 0.5)',
  INFO: 'rgba(255, 255, 255, 0.5)',
  WARN: 'rgba(255, 193, 7, 0.5)',
  ERROR: 'rgba(204, 0, 0, 0.5)',
};

export const breakpoints = {
  smallSidebar: 232,
  sidebar: 288,
  small: 576,
  medium: 768,
  large: 992,
  xlarge: 1200,
  full: 1452,
};
