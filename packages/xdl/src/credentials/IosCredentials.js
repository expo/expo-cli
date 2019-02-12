/* @flow */

import Api from '../Api';
import * as IosCodeSigning from '../detach/IosCodeSigning';

export type Credentials = {
  appleId?: string,
  password?: string,
  teamId?: string,
  certP12?: string,
  certPassword?: string,
  pushP12?: string,
  pushPassword?: string,
  provisioningProfile?: string,
  enterpriseAccount?: string,
  // These are ids on the spaceship object (implementation detail), Spaceship::Portal::Certificate
  certId?: string,
  pushId?: string,
  provisioningProfileId?: string,
};

export type CredObject = {
  name: string,
  value: {
    userCredentialsId?: string,
    serialNumber?: string,
  },
};

export type CredsList = Array<CredObject>;

export async function getExistingDistCerts(
  username: string,
  appleTeamId: string
): Promise<?CredsList> {
  const distCerts = await getExistingUserCredentials(username, appleTeamId, 'dist-cert');
  return distCerts.map(({ usedByApps, userCredentialsId, certId, certP12, certPassword }) => {
    const serialNumber = IosCodeSigning.findP12CertSerialNumber(certP12, certPassword);
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
        userCredentialsId: String(userCredentialsId),
      },
      name,
    };
  });
}

export async function getExistingPushKeys(
  username: string,
  appleTeamId: string
): Promise<?CredsList> {
  const pushKeys = await getExistingUserCredentials(username, appleTeamId, 'push-key');
  return pushKeys.map(({ usedByApps, userCredentialsId, apnsKeyId }) => {
    let name = `Key ID: ${apnsKeyId}`;
    if (usedByApps) {
      name = `Used in apps: ${usedByApps.join(', ')} (${name})`;
    }
    return {
      value: {
        userCredentialsId,
      },
      name,
    };
  });
}

async function getExistingUserCredentials(
  username: string,
  appleTeamId: string,
  type: string
): Promise<?CredsList> {
  const { err, certs } = await Api.callMethodAsync('getExistingUserCredentials', [], 'post', {
    username,
    appleTeamId,
    type,
  });

  if (err) {
    throw new Error('Error getting existing distribution certificates.');
  } else {
    return certs.map(({ usedByApps, userCredentialsId, ...rest }) => ({
      usedByApps: usedByApps && usedByApps.split(';'),
      userCredentialsId: String(userCredentialsId),
      ...rest,
    }));
  }
}
