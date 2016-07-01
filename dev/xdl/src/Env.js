/**
 * @flow
 */

export function home(): ?string {
  return process.env.HOME;
}

export function isStaging() {
  return !!process.env.EXPONENT_STAGING;
}

export function isLocal() {
  return !!process.env.EXPONENT_LOCAL;
}
