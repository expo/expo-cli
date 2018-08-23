export function isNode() {
  return typeof window !== 'undefined' ? false : true;
}
