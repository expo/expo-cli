import {
  convertCertificateToCertificatePEM,
  convertKeyPairToPEM,
  generateKeyPair,
  generateSelfSignedCodeSigningCertificate,
} from '@expo/code-signing-certificates';
import { getConfig } from '@expo/config';
import { vol } from 'memfs';

import { actionAsync as configureCodeSigningAsync } from '../configureCodeSigningAsync';

jest.mock('fs');

describe('codesigning:configure', () => {
  afterEach(() => {
    vol.reset();
  });

  it('configures a project with a certificate', async () => {
    const projectRoot = '/wat';

    const keyPair = generateKeyPair();
    const validityNotBefore = new Date();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotBefore,
      validityNotAfter,
      commonName: 'hello',
    });

    const keyPairPEM = convertKeyPairToPEM(keyPair);
    const certificatePEM = convertCertificateToCertificatePEM(certificate);

    const expoPackageJson = JSON.stringify({
      name: 'expo',
      version: '40.0.0',
    });

    vol.fromJSON(
      {
        'package.json': JSON.stringify({ dependencies: { expo: '40.0.0' } }),
        'app.json': JSON.stringify({ name: 'test', slug: 'wat' }),
        'keys/certificate.pem': certificatePEM,
        'keys/private-key.pem': keyPairPEM.privateKeyPEM,
        'keys/public-key.pem': keyPairPEM.publicKeyPEM,
        'node_modules/expo/package.json': expoPackageJson,
      },
      projectRoot
    );

    const configBefore = getConfig(projectRoot);
    expect(configBefore.exp.updates?.codeSigningCertificate).toBeUndefined();

    await configureCodeSigningAsync(projectRoot, { input: 'keys' });

    const config = getConfig(projectRoot);
    expect(config.exp.updates.codeSigningCertificate).toEqual('./keys/certificate.pem');
    expect(config.exp.updates.codeSigningMetadata).toMatchObject({
      keyid: 'main',
      alg: 'rsa-v1_5-sha256',
    });
  });

  it('validates the certificate', async () => {
    const invalidPrivateKeyPEM = `
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA6UB6KxIe3m9S/BybinIsi/6qCwL86xxL59G2ny+q8sC7vrAa
pyNIwS4u+q42DpTu0bsvF/7W2eqzI6ACI1uc45OkgGTGE1QHKCZOqCoNYYEVQOmT
EN7r0wb8PSQL5yctp7I10DWplvxCxbZTAI/Vzp01OwRqIbp1HCEE38oouSGWcGhv
1bMiVwVThlHCaBvnH+mkvRPuyA/wTR+KmCBOyCvo2buRLZsd/AZs1yZKNUtI0Vhr
2kmSjOPEtRDbD9zYGyPfVU7u3kMo6JyuYKXmGWmkR2Dk/ojzVN5RmKsi2evNCGgc
2Qswo1DQhtHvOm/x+9MlHWe6h9dcoLY40TAwEwIDAQABAoIBAQCJ5n7T3AC4DSUI
vHkQ3vOLSOKLZBbXgYE26vuHHY15u4zD7iWzzt6Cp6VKu5hmApM3F+19yEKJz4Jd
e4oIEW+t9Gn7JpkccD9S82LpdQM4NDK2j+FMxh6yQpz6IMeQv870KB48nJ1JEJcB
gQuNd3w2jScdXzzH+A6otLTHAiQVXq7uLcLZ3fqBYev4yh4wOQUETjr+HxPMPEFZ
hN42ZnGIRnV4AdrKPR4RSVXGJAhP1zaEg/jNjCWvljFkM9Db8fQcmjTBUEj3jil3
1Mtw5kfWrXHBHjnOMxjb5OZF1nQAjayMlNJ6RAkq6YTqegjkRTpDaBt5dYmwngdN
JjIXG7ihAoGBAP/MGklGE0wnDtRgqed/lDLb93Kr6ra3FKY8wAVyNANfIjrLbcJu
5fkTQzADn6qtF63euODFzJTAXPsBuu21Wr0kH5TwI2ARxTxMbesnOv5M3IH95Ft/
Jx/8vgMHDw9wEyUgXGT0IP3rHZXA0MHU5He4OMTjIuGekq3rHiWZIs2bAoGBAOlv
zOiFwtNZuvh9L7e+LwB2nVMxYH6suX+LKJ3ZtkZsfJ6KC/tol0BhB5aHNvpQnL+y
y4m/ohbDL1DyKVkyXwIDQEY/xFN7IyzU219GCgAX/w0glqRzrnl7DZgq2cma6bwR
2L5w+C68W6qXtW/0dNMm+n2bFUt29Bo2fUSyoQrpAoGASRXi6M6p0tdSCGI6CVfN
Wx64O75dCKmUr86puqSfsdrrp8rZ6HTRJnJXfw95/kUIf/gj8KzzQAkaR+l9pE9t
xp7cmyxlnxxUs17PBSInW+NQGaAWMAJLhnsrOyg4KFwITFJLs9iA2KvlvxThUJBo
WsB7D94p6Dbrh9+mtG1loUMCgYEAyR2wbZhojQyewF2ikeyBtCV9T+KXnyuSuacb
/DtJBg2LpE+NGTI4NZgjIHYoUKrJEYOqRmha7r+E8XlhVF7IagSBCMUBkWbinEpb
Ig9GqGQEMrwj7VVZOYJh6PrqHf6gZ478rL7JpAJV+3ivMeBsEktfvn2xcA3xKvBN
JrW7d5kCgYAP+PJAfksrkv3yXYG9Ks0a/A6Qfdyi5wXhRg8W+tO2BZnrZM1RSKOe
TQ0lSpAA7SLCSJwSEqxt22sY4mzM7PjWi824BF/eNJ4lB+DCRFIuSsv4dxTa9HdG
theL0jT06zzlIuUsA0npbadnkOGi1p7u5LtGbA6RI4Kc6L7sBow71w==
-----END RSA PRIVATE KEY-----
`;
    const invalidPublicKeyPEM = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6UB6KxIe3m9S/BybinIs
i/6qCwL86xxL59G2ny+q8sC7vrAapyNIwS4u+q42DpTu0bsvF/7W2eqzI6ACI1uc
45OkgGTGE1QHKCZOqCoNYYEVQOmTEN7r0wb8PSQL5yctp7I10DWplvxCxbZTAI/V
zp01OwRqIbp1HCEE38oouSGWcGhv1bMiVwVThlHCaBvnH+mkvRPuyA/wTR+KmCBO
yCvo2buRLZsd/AZs1yZKNUtI0Vhr2kmSjOPEtRDbD9zYGyPfVU7u3kMo6JyuYKXm
GWmkR2Dk/ojzVN5RmKsi2evNCGgc2Qswo1DQhtHvOm/x+9MlHWe6h9dcoLY40TAw
EwIDAQAB
-----END PUBLIC KEY-----
`;
    const invalidCertificatePEM = `
-----BEGIN CERTIFICATE-----
MIICzTCCAbWgAwIBAgIJbOc3N87bRTW9MA0GCSqGSIb3DQEBCwUAMBAxDjAMBgNV
BAMTBWhlbGxvMB4XDTIyMDIwNDAxNDkzNFoXDTIyMDIwNDAxNDkzNFowEDEOMAwG
A1UEAxMFaGVsbG8wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDpQHor
Eh7eb1L8HJuKciyL/qoLAvzrHEvn0bafL6rywLu+sBqnI0jBLi76rjYOlO7Ruy8X
/tbZ6rMjoAIjW5zjk6SAZMYTVAcoJk6oKg1hgRVA6ZMQ3uvTBvw9JAvnJy2nsjXQ
NamW/ELFtlMAj9XOnTU7BGohunUcIQTfyii5IZZwaG/VsyJXBVOGUcJoG+cf6aS9
E+7ID/BNH4qYIE7IK+jZu5Etmx38BmzXJko1S0jRWGvaSZKM48S1ENsP3NgbI99V
Tu7eQyjonK5gpeYZaaRHYOT+iPNU3lGYqyLZ680IaBzZCzCjUNCG0e86b/H70yUd
Z7qH11ygtjjRMDATAgMBAAGjKjAoMA4GA1UdDwEB/wQEAwIHgDAWBgNVHSUBAf8E
DDAKBggrBgEFBQcDAzANBgkqhkiG9w0BAQsFAAOCAQEAKk5tUXJM9ofr7UWeElm0
G30mMWG6heQm/Id0oSy5JY3w4+fbWxqYqUzEiUEwJnTFkfFw3l5AJUwNXKs57XqZ
MFdxNTrFVE7N8hE3RzW93J3cS/cDF4gkmhDJFT5svDwsuQUnfrTMsC1SpNx2HJzK
AcpDOgKHfDf/5H1eV9THMK3uqCpg0144iVxWazBFENZ+GGWUjAhyEFM8VIazk/6S
8vc2DvWHI0hN0gNGIddY1rEjbZ6Vdi5yXTtja5A2mE7adHNvrc+aAUX8o94n59Af
STflvOlXarKkGGiZnyrkVovH71QOfoQBES8W1fGmRdJu2sjhkf/68XZTXFp+z/8a
Ww==
-----END CERTIFICATE-----
`;

    const projectRoot = '/wat';

    const expoPackageJson = JSON.stringify({
      name: 'expo',
      version: '40.0.0',
    });

    vol.fromJSON(
      {
        'package.json': JSON.stringify({ dependencies: { expo: '40.0.0' } }),
        'app.json': JSON.stringify({ name: 'test', slug: 'wat' }),
        'keys/certificate.pem': invalidCertificatePEM,
        'keys/private-key.pem': invalidPrivateKeyPEM,
        'keys/public-key.pem': invalidPublicKeyPEM,
        'node_modules/expo/package.json': expoPackageJson,
      },
      projectRoot
    );

    const configBefore = getConfig(projectRoot);
    expect(configBefore.exp.updates?.codeSigningCertificate).toBeUndefined();

    await expect(configureCodeSigningAsync(projectRoot, { input: 'keys' })).rejects.toThrow(
      'Certificate validity expired'
    );

    const config = getConfig(projectRoot);
    expect(config.exp.updates?.codeSigningCertificate).toBeUndefined();
    expect(config.exp.updates?.codeSigningMetadata).toBeUndefined();
  });
});
