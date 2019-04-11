export function joinURI(...arr) {
  const first = arr[0] || '';
  const join = arr.join('/');
  return normalizeURI(join[0] === '/' && first[0] !== '/' ? join.substring(1) : join);
}

export function normalizeURI(uri) {
  return uri.replace(/(:\/\/)|(\\+|\/{2,})+/g, match => (match === '://' ? '://' : '/'));
}
