import Api from '../Api';
import { findP12CertSerialNumber } from '../detach/PKCS12Utils';
import UserManager from '../User';
import { ApiV2 } from '../xdl';

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

export type CredsList = Array<CredObject>;

export async function getExistingDistCerts(
  username: string,
  appleTeamId: string,
  options: { provideFullCertificate?: boolean } = {}
): Promise<CredsList> {
  const distCerts = await getExistingUserCredentials(username, appleTeamId, 'dist-cert');
  return formatDistCerts(distCerts, options);
}

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

export async function getExistingPushKeys(
  username: string,
  appleTeamId: string,
  options: { provideFullPushKey?: boolean } = {}
): Promise<CredsList> {
  const pushKeys = await getExistingUserCredentials(username, appleTeamId, 'push-key');
  return formatPushKeys(pushKeys, options);
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

async function getExistingUserCredentials(
  username: string,
  appleTeamId: string,
  type: string
): Promise<CredsList> {
  let certs;
  if (process.env.EXPO_NEXT_API) {
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);
    const { userCredentials, appCredentials } = await api.getAsync(`credentials/ios`);

    certs = userCredentials
      .filter((cred: any) => cred.type === type && cred.teamId === appleTeamId)
      .map(({ id, ...cred }: any) => ({
        ...cred,
        userCredentialsId: id,
        usedByApps: appCredentials
          .filter((app: any) => app.pushCredentialsId === id || app.distCredentialsId === id)
          .map(({ experienceName }: any) => experienceName)
          .join(';'),
      }));
  } else {
    const result = await Api.callMethodAsync('getExistingUserCredentials', [], 'post', {
      username,
      appleTeamId,
      type,
    });

    if (result.err) {
      throw new Error('Error getting existing distribution certificates.');
    }
    certs = result.certs;
  }

  return certs.map(({ usedByApps, userCredentialsId, ...rest }: any) => ({
    usedByApps: usedByApps && usedByApps.split(';'),
    userCredentialsId: String(userCredentialsId),
    ...rest,
  }));
}
