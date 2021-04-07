import internalIp from 'internal-ip';

export function address() {
  return internalIp.v4.sync() || '127.0.0.1';
}
