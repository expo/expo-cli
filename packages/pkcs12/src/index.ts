import crypto, { HexBase64Latin1Encoding, Utf8AsciiLatin1Encoding } from 'crypto';
import forge from 'node-forge';

/**
 * Returns the serial number of the given X.509 certificate as an uppercased hexadecimal string
 */
export function getFormattedSerialNumber(certificate: forge.pki.Certificate): string | null {
  const { serialNumber } = certificate;
  return serialNumber ? serialNumber.replace(/^0+/, '').toUpperCase() : null;
}

/**
 * Extracts a certificate from PKCS#12
 * This is assumed to be a conventional PKCS#12 where there is exactly one certificate and one key
 */
export function getX509Certificate(p12: forge.pkcs12.Pkcs12Pfx): forge.pki.Certificate {
  const certBagType = forge.pki.oids.certBag;
  const bags = p12.getBags({ bagType: certBagType })[certBagType];
  if (!bags || bags.length === 0) {
    throw new Error(`PKCS12: No certificates found`);
  }
  const certificate = bags[0].cert;
  if (!certificate) {
    throw new Error('PKCS12: bag is not a certificate');
  }
  return certificate;
}

/**
 * Extracts a certificate from PKCS#12
 * This is assumed to be a PKCS#12 in Keystore format where the friendlyName (alias) contains a PrivateKeyEntry
 * A PrivateKeyEntry contains exactly one certificate and one key
 * https://docs.oracle.com/javase/7/docs/api/java/security/KeyStore.PrivateKeyEntry.html
 */
export function getX509CertificateByFriendlyName(
  p12: forge.pkcs12.Pkcs12Pfx,
  friendlyName: string
): forge.pki.Certificate {
  const certBagType = forge.pki.oids.certBag;
  const bags = p12.getBags({ friendlyName, bagType: certBagType }).friendlyName;
  if (!bags || bags.length === 0) {
    throw new Error(`PKCS12: No certificates found under friendlyName: ${friendlyName}`);
  }
  const certificate = bags[0].cert;
  if (!certificate) {
    throw new Error('PKCS12: bag is not a certificate');
  }
  return certificate;
}

export function getPKCS12(
  p12BufferOrBase64String: Buffer | string,
  maybePassword: string | null
): forge.pkcs12.Pkcs12Pfx {
  const base64EncodedP12 = Buffer.isBuffer(p12BufferOrBase64String)
    ? p12BufferOrBase64String.toString('base64')
    : p12BufferOrBase64String;
  const password = String(maybePassword || '');
  const p12Der = forge.util.decode64(base64EncodedP12);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  return forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
}

function getHash(
  data: string,
  {
    upperCase,
    hashAlgorithm,
    hashEncoding,
    inputEncoding,
  }: {
    upperCase?: boolean;
    hashAlgorithm?: string;
    hashEncoding?: HexBase64Latin1Encoding;
    inputEncoding?: Utf8AsciiLatin1Encoding;
  }
): string {
  const hash = crypto.createHash(hashAlgorithm ?? 'sha1');
  if (inputEncoding) {
    hash.update(data, inputEncoding);
  } else {
    hash.update(data); // use node default inputEncoding
  }
  const digest = hash.digest(hashEncoding ?? 'hex');
  return upperCase ? digest.toUpperCase() : digest;
}

export function getCertificateFingerprint(
  certificate: forge.pki.Certificate,
  {
    upperCase,
    hashAlgorithm,
  }: {
    upperCase?: boolean;
    hashAlgorithm?: string;
  }
): string {
  const certAsn1 = forge.pki.certificateToAsn1(certificate);
  const certDer = forge.asn1.toDer(certAsn1).getBytes(); // binary encoded string
  return getHash(certDer, {
    upperCase,
    hashAlgorithm,
    hashEncoding: 'hex',
    inputEncoding: 'latin1', // latin1 is an alias for binary
  });
}
