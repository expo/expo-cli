import {
  getCertificateFingerprint,
  getFormattedSerialNumber,
  getPKCS12,
  getX509Certificate,
  getX509CertificateByFriendlyName,
} from '..';

// https://pkijs.org/examples/PKCS12SimpleExample.html
// PKCS#12 With Password-Based Integrity Protection And No Privacy Protection
// A PKCS#12 file with one key and one certificate (most common case)
const conventionalP12 = {
  base64EncodedP12:
    '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',
  password: 'test',
  serialNumber: '1',
  md5Fingerprint: '2557D902372F89802767249FC6D65113',
  sha1Fingerprint: '02EC75A7181C575757BAA931FE3105B7125FF10A',
  sha256Fingerprint: 'FBA434E1877FBBF48CD041389EF9E1C0B511D1426C69D6D110E7D2A7DB6B5890',
};

// Generated by: keytool -genkey -alias test-alias -keystore keystore.p12 -storetype PKCS12 -keyalg RSA -storepass password -validity 730 -keysize 2048
// A PKCS#12 file in keystore format, where all entries are under aliases
// This particular PKCS#12 has one key and one certificate under 'test-alias'
const keystoreP12 = {
  base64EncodedP12:
    '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',
  password: 'password',
  alias: 'test-alias',
  md5Fingerprint: 'CCD9D0FD20A862B1E67EA838C99DD0C5',
  sha1Fingerprint: '2EF9743A1BF12189AF5503787B54BFD3254B46A8',
  sha256Fingerprint: 'EECDD35E90BB272D52EC261B4063C5D586980795452340525F9C8CC56DB53E2B',
};
describe('reading PKCS#12 files', () => {
  it('computes fingerprints of certificates in conventional p12 files', async () => {
    const {
      base64EncodedP12,
      password,
      md5Fingerprint: expectedMd5Fingerprint,
      sha1Fingerprint: expectedSha1Fingerprint,
      sha256Fingerprint: expectedSha256Fingerprint,
    } = conventionalP12;
    const p12 = getPKCS12(base64EncodedP12, password);
    const certificate = getX509Certificate(p12);
    const md5Fingerprint = getCertificateFingerprint(certificate, {
      upperCase: true,
      hashAlgorithm: 'md5',
    });
    const sha1Fingerprint = getCertificateFingerprint(certificate, {
      upperCase: true,
      hashAlgorithm: 'sha1',
    });
    const sha256Fingerprint = getCertificateFingerprint(certificate, {
      upperCase: true,
      hashAlgorithm: 'sha256',
    });
    expect(md5Fingerprint).toEqual(expectedMd5Fingerprint);
    expect(sha1Fingerprint).toEqual(expectedSha1Fingerprint);
    expect(sha256Fingerprint).toEqual(expectedSha256Fingerprint);
  });
  it('computes fingerprints of certificates in p12 keystores', async () => {
    const {
      base64EncodedP12,
      password,
      alias,
      md5Fingerprint: expectedMd5Fingerprint,
      sha1Fingerprint: expectedSha1Fingerprint,
      sha256Fingerprint: expectedSha256Fingerprint,
    } = keystoreP12;
    const p12 = getPKCS12(base64EncodedP12, password);
    const certificate = getX509CertificateByFriendlyName(p12, alias);
    const md5Fingerprint = getCertificateFingerprint(certificate, {
      upperCase: true,
      hashAlgorithm: 'md5',
    });
    const sha1Fingerprint = getCertificateFingerprint(certificate, {
      upperCase: true,
      hashAlgorithm: 'sha1',
    });
    const sha256Fingerprint = getCertificateFingerprint(certificate, {
      upperCase: true,
      hashAlgorithm: 'sha256',
    });
    expect(md5Fingerprint).toEqual(expectedMd5Fingerprint);
    expect(sha1Fingerprint).toEqual(expectedSha1Fingerprint);
    expect(sha256Fingerprint).toEqual(expectedSha256Fingerprint);
  });
  it('reads X.509 certificate serial numbers from conventional p12 files', async () => {
    const { base64EncodedP12, password, serialNumber: expectedSerialNumber } = conventionalP12;
    const p12 = getPKCS12(base64EncodedP12, password);
    const certificate = getX509Certificate(p12);
    const serialNumber = getFormattedSerialNumber(certificate);
    expect(serialNumber).toEqual(expectedSerialNumber);
  });
  it('reads X.509 certificates from conventional p12 files', async () => {
    const { base64EncodedP12, password } = conventionalP12;
    const p12 = getPKCS12(base64EncodedP12, password);
    const certificate = getX509Certificate(p12);
    expect(certificate).toMatchSnapshot();
  });
});
