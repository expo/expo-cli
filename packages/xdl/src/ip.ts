import os from 'os';

type IpFamily = 'IPv4' | 'IPv6';

function priority(name: string) {
  if (name.startsWith('en') || name.startsWith('eth')) {
    return 0;
  }
  if (name.startsWith('wlan')) {
    return 1;
  }

  return 2;
}

function isLoopback(addr: string) {
  return (
    /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/.test(addr) ||
    /^fe80::1$/.test(addr) ||
    /^::1$/.test(addr) ||
    /^::$/.test(addr)
  );
}

function loopback(family: IpFamily = 'IPv4') {
  if (family === 'IPv4') {
    return '127.0.0.1';
  } else if (family === 'IPv6') {
    return 'fe80::1';
  } else {
    throw new Error('IP family must be IPv4 or IPv6');
  }
}

function address(family: IpFamily = 'IPv4') {
  const interfaces = os.networkInterfaces();
  const sortedInterfaces = Object.keys(interfaces).sort(function(a, b) {
    return priority(a) - priority(b);
  });

  const all = sortedInterfaces
    .map(function(nic) {
      const addresses = interfaces[nic].filter(
        details => details.family === family && !isLoopback(details.address)
      );
      return addresses.length ? addresses[0].address : undefined;
    })
    .filter(Boolean);

  return all.length ? all[0] : loopback(family);
}

export default {
  address,
};
