import { findP12CertSerialNumber } from '../detach/PKCS12Utils';

export type Credentials = {
  appleId?: string;
  password?: string;
  teamId?: string;
  certP12?: string;
  certPassword?: string;
  pushP12?: string;
  pushPassword?: string;
  provisioningProfile?: string;
  enterpriseAccount?: string;
  // These are ids on the spaceship object (implementation detail), Spaceship::Portal::Certificate
  certId?: string;
  pushId?: string;
  provisioningProfileId?: string;

  pushPrivateSigningKey?: string;
  certPrivateSigningKey?: string;
  apnsKeyId?: string;
  apnsKeyP8?: string;
};

export type CredObject = {
  name: string;
  value: {
    userCredentialsId?: string;
    serialNumber?: string;
  };
};

export type CredsList = CredObject[];

export function formatDistCerts(distCerts: any, options: { provideFullCertificate?: boolean }) {
  return distCerts.map(({ usedByApps, userCredentialsId, certId, certP12, certPassword }: any) => {
    let serialNumber;
    try {
      serialNumber = findP12CertSerialNumber(certP12, certPassword);
    } catch (error) {
      serialNumber = '------';
    }
    let name = `Serial number: ${serialNumber}`;
    if (certId) {
      name = `${name}, Certificate ID: ${certId}`;
    }
    if (usedByApps) {
      name = `Used in apps: ${usedByApps.join(', ')} (${name})`;
    }
    return {
      value: {
        distCertSerialNumber: serialNumber,
        ...(options.provideFullCertificate
          ? { certP12, certId, certPassword }
          : { userCredentialsId: String(userCredentialsId) }),
      },
      name,
    };
  });
}

export function formatPushKeys(pushKeys: any, options: { provideFullPushKey?: boolean }) {
  return pushKeys.map(({ usedByApps, userCredentialsId, apnsKeyId, apnsKeyP8 }: any) => {
    let name = `Key ID: ${apnsKeyId}`;
    if (usedByApps) {
      name = `Used in apps: ${usedByApps.join(', ')} (${name})`;
    }
    return {
      value: {
        ...(options.provideFullPushKey
          ? { apnsKeyId, apnsKeyP8 }
          : { userCredentialsId: String(userCredentialsId) }),
      },
      name,
      short: apnsKeyId,
    };
  });
}
