import forge, { pki } from 'node-forge';

export function getP12CertFingerprint(
  p12Buffer: Buffer | string,
  passwordRaw: string | null
): string {
  const certData = getRawCertData(p12Buffer, passwordRaw);
  const certAsn1 = forge.pki.certificateToAsn1(certData);
  const certDer = forge.asn1.toDer(certAsn1).getBytes();
  return forge.md.sha1.create().update(certDer).digest().toHex().toUpperCase();
}

export function findP12CertSerialNumber(
  p12Buffer: Buffer | string,
  passwordRaw: string | null
): string {
  const { serialNumber } = getCertData(p12Buffer, passwordRaw);
  return serialNumber;
}

export function getCertData(
  p12Buffer: Buffer | string,
  passwordRaw: string | null
): pki.Certificate {
  const certData = getRawCertData(p12Buffer, passwordRaw);
  return {
    ...certData,
    serialNumber: certData.serialNumber.replace(/^0+/, '').toUpperCase(),
  };
}

function getRawCertData(p12Buffer: Buffer | string, passwordRaw: string | null): pki.Certificate {
  if (Buffer.isBuffer(p12Buffer)) {
    p12Buffer = p12Buffer.toString('base64');
  } else if (typeof p12Buffer !== 'string') {
    throw new Error('getCertData only takes strings and buffers.');
  }

  const password = String(passwordRaw || '');
  const p12Der = forge.util.decode64(p12Buffer);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
  const certBagType = forge.pki.oids.certBag;
  const certData = p12.getBags({ bagType: certBagType })?.[certBagType]?.[0]?.cert;
  if (!certData) {
    throw new Error("getRawCertData: couldn't find cert bag");
  }
  return certData;
}
