export function isUUID(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(str);
}
