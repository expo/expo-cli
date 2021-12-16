import assert from 'assert';
import keyBy from 'lodash/keyBy';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { ApiV2 } from 'xdl';

import * as appleApi from '../../appleApi';
import {
  IosAppCredentials,
  IosCredentials,
  IosDistCredentials,
  IosPushCredentials,
} from '../credentials';
import ApiClient from './IosApiV2Wrapper';

export interface AppLookupParams {
  accountName: string;
  projectName: string;
  bundleIdentifier: string;
}

export function getAppLookupParams(experienceName: string, bundleIdentifier: string) {
  const matchedExperienceName = experienceName.match(/@(.+)\/(.+)/);
  assert(matchedExperienceName && matchedExperienceName.length >= 3, 'invalid experience name');
  return {
    accountName: matchedExperienceName[1],
    projectName: matchedExperienceName[2],
    bundleIdentifier,
  };
}

// appCredentials are identified by `${projectFullName} ${bundleIdentifier}` (see getAppCredentialsCacheIndex method)
// userCredentials are identified by id (string or numeric depending on API)
//
// Expected behaviour of cache (internals)
//
// - when isPrefetched[accountName] true assume everything is synced for that account
// - when credentials[accountName].appCredentials[experienceNameBundleIdentifier] is truthy assume that user and app credentials for that app are synced
// - when accessing user or app credentials identified by AppLookupParams fetch all credentials for that app (user and app credentials)
// - when updating userCredentials refetch only userCredentials
// - when deleting userCredentials modify prefetched appCredentials without calling api
// - when updating provisioningProfile refetch all credentials for that app (user and app credentials)
// - when deleting provisioningProfile modify appCredentials in cache
// - when deleting pushCert refetch all credentials for app (app + user)
//
//
interface CredentialsCache {
  [accountName: string]: {
    appCredentials: {
      [experienceNameBundleIdentifier: string]: IosAppCredentials;
    };
    userCredentials: {
      [id: string]: IosDistCredentials | IosPushCredentials;
    };
  };
}

export default class IosApi {
  client: ApiClient;
  credentials: CredentialsCache = {};
  isPrefetched: { [accountName: string]: boolean } = {};

  constructor(api: ApiV2) {
    this.client = new ApiClient(api);
  }

  public async getAllCredentials(accountName: string): Promise<IosCredentials> {
    if (!this.isPrefetched[accountName]) {
      const credentials = await this.client.getAllCredentialsApi(accountName);
      this.credentials[accountName] = {
        appCredentials: keyBy(
          credentials.appCredentials,
          cred => `${cred.experienceName} ${cred.bundleIdentifier}`
        ),
        userCredentials: keyBy(credentials.userCredentials, cred => String(cred.id)),
      };
      this.isPrefetched[accountName] = true;
    }
    return {
      appCredentials: Object.values(this.credentials[accountName]?.appCredentials ?? {}),
      userCredentials: Object.values(this.credentials[accountName]?.userCredentials ?? {}),
    };
  }

  public async getDistCert(appLookupParams: AppLookupParams): Promise<IosDistCredentials | null> {
    await this.ensureAppCredentials(appLookupParams);
    const appCredentialsIndex = this.getAppCredentialsCacheIndex(appLookupParams);
    const { accountName } = appLookupParams;

    const appCredentials = this.credentials[accountName]?.appCredentials?.[appCredentialsIndex];
    if (!appCredentials || !appCredentials.distCredentialsId) {
      return null;
    }

    const distCert = this.credentials[accountName]?.userCredentials?.[
      appCredentials.distCredentialsId
    ] as IosDistCredentials | null;
    return distCert ?? null;
  }

  public async createDistCert(
    accountName: string,
    credentials: appleApi.DistCert
  ): Promise<IosDistCredentials> {
    const id = await this.client.createDistCertApi(accountName, credentials);

    // refetching because www might add some fields (e.g. certSerialNumber)
    await this.refetchUserCredentials(id, accountName);

    const distCert = this.credentials[accountName]?.userCredentials?.[String(id)];
    assert(id && distCert, 'distribution certificate does not exists');
    assert(distCert.type === 'dist-cert', 'wrong type of user credential');
    return distCert as IosDistCredentials;
  }

  public async updateDistCert(
    id: number,
    accountName: string,
    credentials: appleApi.DistCert
  ): Promise<IosDistCredentials> {
    await this.client.updateDistCertApi(id, accountName, credentials);

    // refetching because www might add some fields (e.g. certSerialNumber)
    await this.refetchUserCredentials(id, accountName);

    const distCert = this.credentials[accountName]?.userCredentials[String(id)];
    assert(distCert, 'distribution certificate does not exists');
    assert(distCert.type === 'dist-cert', 'wrong type of user credential');
    return distCert as IosDistCredentials;
  }

  public async deleteDistCert(id: number, accountName: string): Promise<void> {
    await this.client.deleteDistCertApi(id, accountName);
    await this.removeUserCredentialFromCache(id, accountName);
  }

  public async useDistCert(
    appLookupParams: AppLookupParams,
    userCredentialsId: number
  ): Promise<void> {
    await this.client.useDistCertApi(appLookupParams, userCredentialsId);
    await this.refetchAppCredentials(appLookupParams);
  }

  public async createPushKey(
    accountName: string,
    credentials: appleApi.PushKey
  ): Promise<IosPushCredentials> {
    const id = await this.client.createPushKeyApi(accountName, credentials);

    await this.refetchUserCredentials(id, accountName);

    const pushKey = this.credentials[accountName]?.userCredentials?.[String(id)];
    assert(id && pushKey, 'push key does not exists');
    assert(pushKey.type === 'push-key', 'wrong type of user credentials');
    return pushKey;
  }

  public async updatePushKey(
    id: number,
    accountName: string,
    credentials: appleApi.PushKey
  ): Promise<IosPushCredentials> {
    await this.client.updatePushKeyApi(id, accountName, credentials);

    await this.refetchUserCredentials(id, accountName);

    const pushKey = this.credentials[accountName]?.userCredentials?.[String(id)];
    assert(id && pushKey, 'push key does not exists');
    assert(pushKey.type === 'push-key', 'wrong type of user credentials');
    return pushKey;
  }

  public async deletePushKey(id: number, accountName: string) {
    await this.client.deletePushKeyApi(id, accountName);
    await this.removeUserCredentialFromCache(id, accountName);
  }

  public async getPushKey(appLookupParams: AppLookupParams): Promise<IosPushCredentials | null> {
    await this.ensureAppCredentials(appLookupParams);
    const appCredentialsIndex = this.getAppCredentialsCacheIndex(appLookupParams);
    const { accountName } = appLookupParams;

    const appCredentials = this.credentials[accountName]?.appCredentials?.[appCredentialsIndex];
    if (!appCredentials || !appCredentials.pushCredentialsId) {
      return null;
    }

    const pushKey = this.credentials[accountName]?.userCredentials?.[
      appCredentials.pushCredentialsId
    ] as IosPushCredentials | null;
    return pushKey ?? null;
  }

  public async usePushKey(
    appLookupParams: AppLookupParams,
    userCredentialsId: number
  ): Promise<void> {
    await this.client.usePushKeyApi(appLookupParams, userCredentialsId);
    await this.refetchAppCredentials(appLookupParams);
  }

  public async getPushCert(
    appLookupParams: AppLookupParams
  ): Promise<{ pushId: string; pushP12: string; pushPassword: string } | null> {
    const appCredentials = await this.getAppCredentials(appLookupParams);
    const pushId = appCredentials?.credentials?.pushId;
    const pushP12 = appCredentials?.credentials?.pushP12;
    const pushPassword = appCredentials?.credentials?.pushPassword;
    if (!pushId || !pushP12 || !pushPassword) {
      return null;
    }
    return { pushId, pushP12, pushPassword };
  }

  public async deletePushCert(appLookupParams: AppLookupParams): Promise<void> {
    await this.client.deletePushCertApi(appLookupParams);
    await this.refetchAppCredentials(appLookupParams);
  }

  public async getAppCredentials(appLookupParams: AppLookupParams): Promise<IosAppCredentials> {
    const appCredentialsIndex = this.getAppCredentialsCacheIndex(appLookupParams);
    const { accountName } = appLookupParams;

    await this.ensureAppCredentials(appLookupParams);
    return this.credentials[accountName]?.appCredentials?.[appCredentialsIndex];
  }

  public async getProvisioningProfile(
    appLookupParams: AppLookupParams
  ): Promise<appleApi.ProvisioningProfile | null> {
    const appCredentials = await this.getAppCredentials(appLookupParams);
    const provisioningProfile = appCredentials?.credentials?.provisioningProfile;
    if (!provisioningProfile) {
      return null;
    }
    return pick(appCredentials.credentials, [
      'provisioningProfile',
      'provisioningProfileId',
      'teamId',
      'teamName',
    ]) as appleApi.ProvisioningProfile;
  }

  public async updateProvisioningProfile(
    appLookupParams: AppLookupParams,
    provisioningProfile: appleApi.ProvisioningProfile
  ): Promise<appleApi.ProvisioningProfile> {
    const appCredentialsIndex = this.getAppCredentialsCacheIndex(appLookupParams);
    const { accountName } = appLookupParams;

    await this.client.updateProvisioningProfileApi(appLookupParams, provisioningProfile);
    await this.refetchAppCredentials(appLookupParams);
    return pick(this.credentials[accountName]?.appCredentials?.[appCredentialsIndex]?.credentials, [
      'provisioningProfile',
      'provisioningProfileId',
      'teamId',
      'teamName',
    ]) as appleApi.ProvisioningProfile;
  }

  public async deleteProvisioningProfile(appLookupParams: AppLookupParams): Promise<void> {
    const appCredentialsIndex = this.getAppCredentialsCacheIndex(appLookupParams);
    const { accountName } = appLookupParams;

    await this.client.deleteProvisioningProfileApi(appLookupParams);
    const appCredentials = this.credentials?.[accountName]?.appCredentials?.[appCredentialsIndex];
    if (appCredentials?.credentials) {
      // teamId should still be there because it might be part of push cert definition
      appCredentials.credentials = omit(appCredentials.credentials, [
        'provisioningProfile',
        'provisioningProfileId',
      ]);
    }
  }

  private getAppCredentialsCacheIndex(appLookupParams: AppLookupParams): string {
    const { accountName, projectName, bundleIdentifier } = appLookupParams;
    const projectFullName = `@${accountName}/${projectName}`;
    return `${projectFullName} ${bundleIdentifier}`;
  }

  private removeUserCredentialFromCache(id: number, accountName: string): void {
    if (this.credentials[accountName]?.userCredentials?.[String(id)]) {
      delete this.credentials[accountName].userCredentials[String(id)];
    }
    const appCredentials = this.credentials[accountName]?.appCredentials;
    if (appCredentials) {
      Object.entries(appCredentials).forEach(([key, val]) => {
        if (val.distCredentialsId === id) {
          delete appCredentials[key].distCredentialsId;
        }
        if (val.pushCredentialsId === id) {
          delete appCredentials[key].pushCredentialsId;
        }
      });
    }
  }

  // ensures that credentials are fetched from the server if they exists
  // if there is no credentials on server for specific app this function should still succeed.
  private async ensureAppCredentials(appLookupParams: AppLookupParams): Promise<void> {
    const appCredentialsIndex = this.getAppCredentialsCacheIndex(appLookupParams);
    const { accountName } = appLookupParams;

    if (
      this.isPrefetched[accountName] ||
      this.credentials?.[accountName]?.appCredentials?.[appCredentialsIndex]
    ) {
      return;
    }
    await this.refetchAppCredentials(appLookupParams);
  }

  private async refetchUserCredentials(id: number, accountName: string): Promise<void> {
    const userCredentials = await this.client.getUserCredentialsByIdApi(id, accountName);
    if (!userCredentials || !userCredentials.id) {
      return;
    }
    this.credentials[accountName] = {
      ...this.credentials[accountName],
      userCredentials: {
        ...this.credentials[accountName]?.userCredentials,
        [String(id)]: userCredentials,
      },
    };
  }

  private async refetchAppCredentials(app: AppLookupParams): Promise<void> {
    const { accountName } = app;
    const appCredentialsIndex = this.getAppCredentialsCacheIndex(app);
    const data = await this.client.getAllCredentialsForAppApi(app);
    if (!data) {
      return;
    }
    this.credentials[accountName] = {
      appCredentials: {
        ...this.credentials[accountName]?.appCredentials,
        [appCredentialsIndex]: omit(data, [
          'pushCredentials',
          'distCredentials',
        ]) as IosAppCredentials,
      },
      userCredentials: {
        ...this.credentials[accountName]?.userCredentials,
        ...(data.pushCredentialsId
          ? {
              [String(data.pushCredentialsId)]: {
                ...data.pushCredentials,
                id: data.pushCredentialsId,
                type: 'push-key',
              },
            }
          : {}),
        ...(data.distCredentialsId
          ? {
              [String(data.distCredentialsId)]: {
                ...data.distCredentials,
                id: data.distCredentialsId,
                type: 'dist-cert',
              },
            }
          : {}),
      },
    };
  }
}
