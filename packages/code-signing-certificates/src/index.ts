import assert from 'assert';
import { md, pki as PKI, random, util } from 'node-forge';

import { toPositiveHex } from './utils';

/**
 * Generate a public and private RSA key pair.
 * @returns RSA key pair
 */
export function generateKeyPair(): PKI.rsa.KeyPair {
  return PKI.rsa.generateKeyPair();
}

/**
 * Convert a key RSA key pair generated using {@link generateKeyPair} to PEM strings.
 * @param keyPair RSA key pair
 * @returns PEM formatted key pair
 */
export function convertKeyPairToPEM(
  keyPair: PKI.rsa.KeyPair
): { privateKeyPEM: string; publicKeyPEM: string } {
  return {
    privateKeyPEM: PKI.privateKeyToPem(keyPair.privateKey),
    publicKeyPEM: PKI.publicKeyToPem(keyPair.publicKey),
  };
}

/**
 * Convert a X.509 certificate generated using {@link generateSelfSignedCodeSigningCertificate} to a PEM string.
 * @param certificate X.509 certificate
 * @returns
 */
export function convertCertificateToCertificatePEM(certificate: PKI.Certificate): string {
  return PKI.certificateToPem(certificate);
}

/**
 * Convert a PEM-formatted RSA key pair to a key pair for use with this library.
 * @param privateKeyPEM PEM formatted private key
 * @param publicKeyPEM PEM formatted public key
 * @returns RSA key pair
 */
export function convertKeyPairPEMToKeyPair({
  privateKeyPEM,
  publicKeyPEM,
}: {
  privateKeyPEM: string;
  publicKeyPEM: string;
}): PKI.rsa.KeyPair {
  return {
    privateKey: PKI.privateKeyFromPem(privateKeyPEM),
    publicKey: PKI.publicKeyFromPem(publicKeyPEM),
  };
}

/**
 * Convert a PEM-formatted RSA public key to a public key for use with this library.
 * @param publicKeyPEM PEM formatted public key
 * @returns RSA public key
 */
export function convertPublicKeyPEMToPublicKey(publicKeyPEM: string): PKI.rsa.PublicKey {
  return PKI.publicKeyFromPem(publicKeyPEM);
}

/**
 * Convert a PEM-formatted RSA private key to a private key for use with this library.
 * @param privateKeyPEM PEM formatted private key
 * @returns RSA private key
 */
export function convertPrivateKeyPEMToPrivateKey(privateKeyPEM: string): PKI.rsa.PrivateKey {
  return PKI.privateKeyFromPem(privateKeyPEM);
}

/**
 * Convert a PEM-formatted X.509 certificate to a certificate for use with this library.
 * @param certificatePEM PEM formatted X.509 certificate
 * @returns  X.509 Certificate
 */
export function convertCertificatePEMToCertificate(certificatePEM: string): PKI.Certificate {
  return PKI.certificateFromPem(certificatePEM);
}

type GenerateParameters = {
  /**
   * Public/private key pair generated via {@link generateKeyPair}.
   */
  keyPair: PKI.rsa.KeyPair;

  /**
   * Certificate validity range start.
   */
  validityNotBefore: Date;

  /**
   * Certificate validity range end.
   */
  validityNotAfter: Date;

  /**
   * CN issuer and subject Distinguished Name (DN).
   * Used for both issuer and subject in the case of self-signed certificates.
   */
  commonName: string;
};

/**
 * Generate a self-signed code-signing certificate for use with expo-updates.
 * Note that while certificate chains may be supported at some point in expo-updates, for now
 * only self-signed certificates are supported.
 *
 * @returns PKI.Certificate valid for expo-updates code signing
 */
export function generateSelfSignedCodeSigningCertificate({
  keyPair: { publicKey, privateKey },
  validityNotBefore,
  validityNotAfter,
  commonName,
}: GenerateParameters): PKI.Certificate {
  const cert = PKI.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = toPositiveHex(util.bytesToHex(random.getBytesSync(9)));

  assert(
    validityNotAfter > validityNotBefore,
    'validityNotAfter must be later than validityNotBefore'
  );
  cert.validity.notBefore = validityNotBefore;
  cert.validity.notAfter = validityNotAfter;

  const attrs = [
    {
      name: 'commonName',
      value: commonName,
    },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([
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
      codeSigning: true,
      emailProtection: false,
      timeStamping: false,
    },
  ]);

  cert.sign(privateKey, md.sha256.create());
  return cert;
}

function arePublicKeysEqual(key1: PKI.rsa.PublicKey, key2: PKI.rsa.PublicKey): boolean {
  // typedef for BigInteger doesn't contain equals method
  return (key1.n as any).equals(key2.n) && (key1.e as any).equals(key2.e);
}

function doPrivateAndPublicKeysMatch(
  privateKey: PKI.rsa.PrivateKey,
  publicKey: PKI.rsa.PublicKey
): boolean {
  // typedef for BigInteger doesn't contain equals method
  return (publicKey.n as any).equals(privateKey.n) && (publicKey.e as any).equals(privateKey.e);
}

/**
 * Validate that a certificate and corresponding key pair can be used for expo-updates code signing.
 * @param certificate X.509 certificate
 * @param keyPair RSA key pair
 */
export function validateSelfSignedCertificate(
  certificate: PKI.Certificate,
  keyPair: PKI.rsa.KeyPair
) {
  if (certificate.issuer.hash !== certificate.subject.hash) {
    throw new Error(
      'Certificate issuer hash does not match subject hash, indicating certificate is not self-signed.'
    );
  }

  const now = new Date();
  if (certificate.validity.notBefore > now || certificate.validity.notAfter < now) {
    throw new Error('Certificate validity expired');
  }

  const keyUsage = certificate.getExtension('keyUsage');
  const digitalSignature = (keyUsage as any).digitalSignature;
  if (!keyUsage || !digitalSignature) {
    throw new Error('X509v3 Key Usage: Digital Signature not present');
  }

  const extKeyUsage = certificate.getExtension('extKeyUsage');
  const codeSigning = (extKeyUsage as any).codeSigning;
  if (!extKeyUsage || !codeSigning) {
    throw new Error('X509v3 Extended Key Usage: Code Signing not present');
  }

  const isValid = certificate.verify(certificate);
  if (!isValid) {
    throw new Error('Certificate signature not valid');
  }

  const certificatePublicKey = certificate.publicKey as PKI.rsa.PublicKey;
  if (!arePublicKeysEqual(certificatePublicKey, keyPair.publicKey)) {
    throw new Error('Certificate pubic key does not match key pair public key');
  }

  if (!doPrivateAndPublicKeysMatch(keyPair.privateKey, keyPair.publicKey)) {
    throw new Error('keyPair key mismatch');
  }
}

/**
 * Sign a string with an RSA private key and verify that the signature is valid for the RSA
 * public key in the certificate.
 * @param privateKey RSA private key
 * @param certificate X.509 certificate
 * @param stringToSign string for which to generate a signature and verify
 * @returns base64-encoded signature
 */
export function signStringRSASHA256AndVerify(
  privateKey: PKI.rsa.PrivateKey,
  certificate: PKI.Certificate,
  stringToSign: string
): string {
  const digest = md.sha256.create().update(stringToSign);
  const digestSignature = privateKey.sign(digest);
  const isValidSignature = (certificate.publicKey as PKI.rsa.PublicKey).verify(
    digest.digest().getBytes(),
    digestSignature
  );

  if (!isValidSignature) {
    throw new Error('Signature generated with private key not valid for certificate');
  }

  return util.encode64(digestSignature);
}
