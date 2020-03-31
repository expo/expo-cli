export type Orientation =
  | 'any'
  | 'natural'
  | 'landscape'
  | 'landscape-primary'
  | 'landscape-secondary'
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'omit';

// https://developer.mozilla.org/en-US/docs/Web/Manifest#orientation
const ANY_ORIENTATIONS = ['any', 'natural', 'omit'];

const PORTRAIT_ORIENTATIONS = ['portrait', 'portrait-primary', 'portrait-secondary'];

const LANDSCAPE_ORIENTATIONS = ['landscape', 'landscape-primary', 'landscape-secondary'];

export function isValid(orientation: string): orientation is Orientation {
  return (
    ANY_ORIENTATIONS.includes(orientation) ||
    LANDSCAPE_ORIENTATIONS.includes(orientation) ||
    PORTRAIT_ORIENTATIONS.includes(orientation)
  );
}

export function isLandscape(orientation: string): boolean {
  return ANY_ORIENTATIONS.includes(orientation) || LANDSCAPE_ORIENTATIONS.includes(orientation);
}

export function isPortrait(orientation: string): boolean {
  return ANY_ORIENTATIONS.includes(orientation) || PORTRAIT_ORIENTATIONS.includes(orientation);
}
