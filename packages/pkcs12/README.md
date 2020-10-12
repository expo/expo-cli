# PKCS#12

PKCS#12 Utility functions to extract conventional and keystore formatted PKCS#12 files

# Examples

## Extracting a certificate from a conventional PKCS#12 file

```
const p12 = getPKCS12(base64EncodedP12, password); // deserializes encodedP12
const certificate = getX509Certificate(p12); // extracts single certificate from p12
const sha1Fingerprint = getCertificateFingerprint(certificate, {
  upperCase: true,
  hashAlgorithm: 'sha1',
}); // Hash like 02EC75A7181C575757BAA931FE3105B7125FF10A
```

## Extracting a certificate from a keystore formatted PKCS#12 file

```
const p12 = getPKCS12(base64EncodedP12, password); // deserializes encodedP12
const certificate = getX509CertificateByFriendlyName(p12, alias); // extracts single certificate stored under alias in p12
const sha1Fingerprint = getCertificateFingerprint(certificate, {
  upperCase: true,
  hashAlgorithm: 'sha1',
}); // Hash like 02EC75A7181C575757BAA931FE3105B7125FF10A
```
