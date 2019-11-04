import internalIp from 'internal-ip';

export default {
  address() {
    return internalIp.v4.sync() || '127.0.0.1';
  },
};
