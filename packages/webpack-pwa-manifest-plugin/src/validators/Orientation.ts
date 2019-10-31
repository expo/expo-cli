// https://developer.mozilla.org/en-US/docs/Web/Manifest#orientation
const VALID_ORIENTATIONS = [
  'any',
  'natural',
  'landscape',
  'landscape-primary',
  'landscape-secondary',
  'portrait',
  'portrait-primary',
  'portrait-secondary',
  'omit',
];

const PORTRAIT_ORIENTATIONS = [
  'any',
  'natural',
  'portrait',
  'portrait-primary',
  'portrait-secondary',
  'omit',
];

const LANDSCAPE_ORIENTATIONS = [
  'any',
  'natural',
  'landscape',
  'landscape-primary',
  'landscape-secondary',
  'omit',
];

export function isValid(orientation: string): boolean {
  return VALID_ORIENTATIONS.includes(orientation);
}

export function isLandscape(orientation: string): boolean {
  return LANDSCAPE_ORIENTATIONS.includes(orientation);
}

export function isPortrait(orientation: string): boolean {
  return PORTRAIT_ORIENTATIONS.includes(orientation);
}
