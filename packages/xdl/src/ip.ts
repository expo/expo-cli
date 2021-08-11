export default {
  address() {
    // https://stackoverflow.com/a/15075395/4047926
    const interfaces = require('os').networkInterfaces();
    for (const devName in interfaces) {
      const iface = interfaces[devName];

      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
          return alias.address;
      }
    }
    return '127.0.0.1';
  },
};
