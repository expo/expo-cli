import { md } from 'node-forge';

import {
  convertCertificatePEMToCertificate,
  convertCertificateToCertificatePEM,
  convertKeyPairPEMToKeyPair,
  convertKeyPairToPEM,
  convertPrivateKeyPEMToPrivateKey,
  generateKeyPair,
  generateSelfSignedCodeSigningCertificate,
  signStringRSASHA256AndVerify,
  validateSelfSignedCertificate,
} from '../src';

describe(generateKeyPair, () => {
  it('generates a key pair', () => {
    const keyPair = generateKeyPair();
    expect(keyPair.privateKey).toBeTruthy();
    expect(keyPair.publicKey).toBeTruthy();

    const digest = md.sha256.create().update('hello');
    expect(
      keyPair.publicKey.verify(digest.digest().getBytes(), keyPair.privateKey.sign(digest))
    ).toBeTruthy();
  });
});

describe(convertKeyPairToPEM, () => {
  it('converts key pair to PEM', () => {
    const keyPair = generateKeyPair();
    const keyPairPEM = convertKeyPairToPEM(keyPair);
    expect(keyPairPEM.privateKeyPEM).toBeTruthy();
    expect(keyPairPEM.publicKeyPEM).toBeTruthy();
  });
});

describe(convertCertificateToCertificatePEM, () => {
  it('converts certificate to PEM', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'test',
    });
    expect(convertCertificateToCertificatePEM(certificate)).toBeTruthy();
  });
});

describe(convertKeyPairPEMToKeyPair, () => {
  it('converts key pair PEM to key pair', () => {
    const keyPair = generateKeyPair();
    const keyPairPEM = convertKeyPairToPEM(keyPair);
    expect(convertKeyPairPEMToKeyPair(keyPairPEM)).toBeTruthy();
  });
});

describe(convertCertificatePEMToCertificate, () => {
  it('converts certificate PEM to certificate', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'test',
    });
    expect(
      convertCertificatePEMToCertificate(convertCertificateToCertificatePEM(certificate))
    ).toBeTruthy();
  });
});

describe(generateSelfSignedCodeSigningCertificate, () => {
  it('generates certificate with correct data', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    // check self-signed
    expect(certificate.issuer.hash).toEqual(certificate.subject.hash);
    // check extensions
    expect(certificate.getExtension('keyUsage')).toMatchObject({
      critical: true,
      dataEncipherment: false,
      digitalSignature: true,
      id: '2.5.29.15',
      keyCertSign: false,
      keyEncipherment: false,
      name: 'keyUsage',
      nonRepudiation: false,
    });
    expect(certificate.getExtension('extKeyUsage')).toMatchObject({
      clientAuth: false,
      codeSigning: true,
      critical: true,
      emailProtection: false,
      id: '2.5.29.37',
      name: 'extKeyUsage',
      serverAuth: false,
      timeStamping: false,
    });
  });
});

describe(validateSelfSignedCertificate, () => {
  it('does not throw for certificate generated with generateSelfSignedCodeSigningCertificate', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    expect(() => validateSelfSignedCertificate(certificate, keyPair)).not.toThrow();
  });

  it('throws when certificate is expired', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    const validity = new Date();
    validity.setFullYear(validity.getFullYear() - 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: validity,
      commonName: 'Test',
    });
    expect(() => validateSelfSignedCertificate(certificate, keyPair)).toThrow(
      'Certificate validity expired'
    );
  });

  it('throws when missing keyUsage', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    certificate.setExtensions([
      {
        name: 'keyUsage',
        critical: true,
        keyCertSign: false,
        digitalSignature: false,
        nonRepudiation: false,
        keyEncipherment: false,
        dataEncipherment: false,
      },
    ]);
    expect(() => validateSelfSignedCertificate(certificate, keyPair)).toThrow(
      'X509v3 Key Usage: Digital Signature not present'
    );
  });

  it('throws when missing extKeyUsage', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    certificate.setExtensions([
      {
        name: 'keyUsage',
        critical: true,
        keyCertSign: false,
        digitalSignature: true,
        nonRepudiation: false,
        keyEncipherment: false,
        dataEncipherment: false,
      },
      {
        name: 'extKeyUsage',
        critical: true,
        serverAuth: false,
        clientAuth: false,
        codeSigning: false,
        emailProtection: false,
        timeStamping: false,
      },
    ]);
    expect(() => validateSelfSignedCertificate(certificate, keyPair)).toThrow(
      'X509v3 Extended Key Usage: Code Signing not present'
    );
  });

  it('throws when certificate public key does not match key pair', () => {
    const keyPair = generateKeyPair();
    const keyPair2 = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    expect(() => validateSelfSignedCertificate(certificate, keyPair2)).toThrow(
      'Certificate pubic key does not match key pair public key'
    );
  });

  it('throws when private key does not match public key', () => {
    const keyPair = generateKeyPair();
    const keyPair2 = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    const keyPairManual = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair2.privateKey,
    };
    expect(() => validateSelfSignedCertificate(certificate, keyPairManual)).toThrow(
      'keyPair key mismatch'
    );
  });
});

describe(signStringRSASHA256AndVerify, () => {
  const testPrivateKey = `
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAp1ILmaSl1pUVFgt/nLtzoaGuBW4OPRFN5uU2rYPow3uy4NfU
LKiir4AWxGETcm4gFIOG3RIbDJys6TAJJLnFEFnzpV+qaNeqaMqnXm4OBspx/WS2
rSSGIwr7raKy4yrpPYJB1A2D5fZ6oFoWROyjbHJvPddu0PqbbEWSM3PzdZYOKfF1
3ofzFOPlsTnlo12QWgksxrcTwgeX7cjHsXaUc+I8U9DRR+9SgKhejWdFNPGcMkEc
5BIXwtkTau+8+DwQzXz775Wlhf0eJwfnNQeleblbLQIp8i+RmfIjPSt8W/iTSN64
iBROpOvnOeJ9gKX922QDZoqWz9o4RTNCPfyYBQIDAQABAoIBAEKMXVTEqbkJHpPg
Cud5nuoAdkhul3cudL+LFw44UtG9V04aSadhgyMuXN/KhIOUzWmbTn6K/vsrLZKp
qllTEdAJFuEFha+hZ4O6ZosmVqnYxzGzZvzCdB9n9OYAugmkPZRbRHdk0LscJ3Wz
nvvW6sDtWtVL5CV2J28O1LFmQsTXPtEE5aQ5KX3Ix0OW1HBdEMOXRDFFDXhf7AKz
nlvl3WRsXLyHYBfKs0pQHy8Gi+zl2OgKZDc9elMdU0Mx0jTJUUDtPSgNAsmdKO26
qmkhbGd/kM1+6h+zngY3m48yD9elDxR3WUIYE2x5tT9fv3T6/xn1QfMz/gtToplx
qY1DegECgYEA3bGUq91QMIH5rxrr2BBQpniXOTtOPAdvRcRh0/EsYhHcuL+uJEtG
W9o9MqrREhXMMeD9Y8RorL+qefJjGq+GRwnPHlDjr6NkGTZfDKUn4IFH1xMbspET
Nen5BsY5inUrQ/LSg1+HiVsSDyIJzGVcGMTOh9qC53M/zIGdiEwHgUECgYEAwTZ3
AVieag5ETYahGdverxCRKlJ0MFJq3VKEdt6EcZHfeY1gmi17vGZ39q6djmfTT9Il
QVP4/mxU2/mg/UgRC+rwiAZs3qlhOrtkrGd9qPOIeZ8PJkoNlvhM2WC2rGjTfXsb
2IKtDEVXetwGgm3SXqpjycI5Xj6/9VlHAmCc4cUCgYAv9dT2AWDxvYyopyhSi+UG
vpvok73vGqSl8UBAu7IgXUDk7wLbczV7dZE7vtyQDwsn10a6KKmEhcp5q0hpY4On
JqYaJuG7A5wKIEsbzzb7SLyj+MxLKzt+tGldX9De9U4w2v1T0nzd6EfV4kVAZMUx
zpHnrgwXykUJFxlffSM6gQKBgQCMxKXHsU0Zb/OLmD7fnDWNzsA02YYVfralMW2Z
PV25cNIkuUBclC7GgNF+RJI+Ip7uVOkXw5pxo3PgIOuOHWduC2nbcPL49ucD52vd
wDjpUyVnlt9uwh1MlPNInRH6YxVTItKS2AJEInEt7ghAFstidTnm0T8Czy0EEFuP
+9vREQKBgQDIQxJ5oPIOEibJqn34z6qm5EmUyme/evvHxtQTaVuQi5CrzD5+qw1C
jOTHmlJQQsb8b1g9wk7n+JbqWYhkRiAE6dwqvp/zDz1VfR90WbAPYQ8ZiXZ07D2P
8P6ZXR3ZyDchuT6oUBXz5WtHUWOzXRJgPbXnFhrkIU8PkZYiPs/4Bw==
-----END RSA PRIVATE KEY-----
`;

  const testCertificate = `
-----BEGIN CERTIFICATE-----
MIICyzCCAbOgAwIBAgIJWVXVdVgS9u+DMA0GCSqGSIb3DQEBCwUAMA8xDTALBgNV
BAMTBFRlc3QwHhcNMjIwMjA0MDEzODU2WhcNMjMwMjA0MDEzODU2WjAPMQ0wCwYD
VQQDEwRUZXN0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp1ILmaSl
1pUVFgt/nLtzoaGuBW4OPRFN5uU2rYPow3uy4NfULKiir4AWxGETcm4gFIOG3RIb
DJys6TAJJLnFEFnzpV+qaNeqaMqnXm4OBspx/WS2rSSGIwr7raKy4yrpPYJB1A2D
5fZ6oFoWROyjbHJvPddu0PqbbEWSM3PzdZYOKfF13ofzFOPlsTnlo12QWgksxrcT
wgeX7cjHsXaUc+I8U9DRR+9SgKhejWdFNPGcMkEc5BIXwtkTau+8+DwQzXz775Wl
hf0eJwfnNQeleblbLQIp8i+RmfIjPSt8W/iTSN64iBROpOvnOeJ9gKX922QDZoqW
z9o4RTNCPfyYBQIDAQABoyowKDAOBgNVHQ8BAf8EBAMCB4AwFgYDVR0lAQH/BAww
CgYIKwYBBQUHAwMwDQYJKoZIhvcNAQELBQADggEBAHTyG2f/CReXVrS3zZjpgnje
Vn2/XYevnaHNWYIxjlUVGaASE/k6qWkM832f0gaZwJYXsll2YxJa5Jcdqa1yq8QA
Ay5YBq8Vv6K6iGTeZ5wTQc3xNys7zcS95eNq7yhDDjbLDbSDdZ8T/1hZqiha2DG5
itLGfBH+HywW2G9njLgIzNcmKx3d76y3jlVXqug1/AVFK9in+r/0t0TYlk+opqZb
H7cjJSefHusnq2vvvR6gbkZzyzSYP5FMlj/RjRCSJ+VHNwCn3fS+KDlJgVOk0Cxc
7n52UGazeFwH3mem89DN+Bhw/uyU0IcIaDLykb6PsTPy2tjHsLpK5kpvfrp2m0o=
-----END CERTIFICATE-----
`;

  it('signs and verifies', () => {
    const privateKey = convertPrivateKeyPEMToPrivateKey(testPrivateKey);
    const certificate = convertCertificatePEMToCertificate(testCertificate);
    const signature = signStringRSASHA256AndVerify(privateKey, certificate, 'hello');
    expect(signature).toEqual(
      'aPDeSpsFhQXJ1+7RjLW1kASwFoXFJSC4oehm24KaDQG4dHKEz7tVWhrVknGFTRSM54tv4sfXh2p7/6hs+XoMrdlwplpPTIo7PyWmRsE7Md36bkhTGDz/vUXD42uzcLXFNEzcV7TjjN63uF82ytrDUR7Hvc3rj16//oX5LdasiSyDeNKpiaOBZeANtPHgJ1opOVrTGcKJb62LRwTl+c5YyPUjd48wAUGS/PrB2ucbBchxWJ1KfL8kEjD41sCZCWWxbHRYiKPely4z8kaEoMwAGgPb6QUlPgg6XilAcHxT1xPlq/VafVnkxjih5czAfRlTn8bEAtLzwep77tLJs5hSZw=='
    );
  });
});
