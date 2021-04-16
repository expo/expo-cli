import { ApiV2 } from 'xdl';

import * as appleApi from '../../appleApi';
import { IosAppCredentials, IosDistCredentials, IosPushCredentials } from '../credentials';

export interface AppLookupParams {
  accountName: string;
  projectName: string;
  bundleIdentifier: string;
}

interface IosAllCredentialsForApp extends IosAppCredentials {
  pushCredentials: Omit<IosPushCredentials, 'id' | 'type'>;
  distCredentials: Omit<IosDistCredentials, 'id' | 'type'>;
}

interface AllCredentialsApiResponse {
  appCredentials: IosAppCredentials[];
  userCredentials: (IosDistCredentials | IosPushCredentials)[];
}

// This class should not be used directly, use only as part of cached api client from ./IosApi.ts
// or mock it in tests (it's easier to mock this class than ApiV2 directly)
export default class ApiClient {
  constructor(private api: ApiV2) {}

  public async getAllCredentialsApi(accountName: string): Promise<AllCredentialsApiResponse> {
    return await this.api.getAsync('credentials/ios', { owner: accountName });
  }
  public async getAllCredentialsForAppApi({
    accountName,
    projectName,
    bundleIdentifier,
  }: AppLookupParams): Promise<IosAllCredentialsForApp> {
    return await this.api.getAsync(
      `credentials/ios/@${accountName}/${projectName}/${bundleIdentifier}`
    );
  }

  public async getUserCredentialsByIdApi(
    id: number,
    accountName: string
  ): Promise<IosDistCredentials | IosPushCredentials> {
    return await this.api.getAsync(`credentials/ios/userCredentials/${id}`, { owner: accountName });
  }

  public async createDistCertApi(
    accountName: string,
    credentials: appleApi.DistCert
  ): Promise<number> {
    const { id } = await this.api.postAsync('credentials/ios/dist', {
      owner: accountName,
      credentials,
    });
    return id;
  }

  public async updateDistCertApi(
    id: number,
    accountName: string,
    credentials: appleApi.DistCert
  ): Promise<void> {
    await this.api.putAsync(`credentials/ios/dist/${id}`, { credentials, owner: accountName });
  }

  public async deleteDistCertApi(id: number, accountName: string): Promise<void> {
    await this.api.deleteAsync(`credentials/ios/dist/${id}`, { owner: accountName });
  }

  public async useDistCertApi(
    { accountName, projectName, bundleIdentifier }: AppLookupParams,
    userCredentialsId: number
  ): Promise<void> {
    await this.api.postAsync('credentials/ios/use/dist', {
      experienceName: `@${accountName}/${projectName}`,
      owner: accountName,
      bundleIdentifier,
      userCredentialsId,
    });
  }

  public async createPushKeyApi(
    accountName: string,
    credentials: appleApi.PushKey
  ): Promise<number> {
    const { id } = await this.api.postAsync('credentials/ios/push', {
      owner: accountName,
      credentials,
    });
    return id;
  }

  public async updatePushKeyApi(
    id: number,
    accountName: string,
    credentials: appleApi.PushKey
  ): Promise<IosPushCredentials> {
    return await this.api.putAsync(`credentials/ios/push/${id}`, { owner: accountName });
  }

  public async deletePushKeyApi(id: number, accountName: string): Promise<void> {
    await this.api.deleteAsync(`credentials/ios/push/${id}`, { owner: accountName });
  }

  public async usePushKeyApi(
    { accountName, projectName, bundleIdentifier }: AppLookupParams,
    userCredentialsId: number
  ): Promise<void> {
    await this.api.postAsync('credentials/ios/use/push', {
      experienceName: `@${accountName}/${projectName}`,
      owner: accountName,
      bundleIdentifier,
      userCredentialsId,
    });
  }

  public async deletePushCertApi({
    accountName,
    projectName,
    bundleIdentifier,
  }: AppLookupParams): Promise<void> {
    await this.api.postAsync(`credentials/ios/pushCert/delete`, {
      experienceName: `@${accountName}/${projectName}`,
      owner: accountName,
      bundleIdentifier,
    });
  }

  public async updateProvisioningProfileApi(
    { accountName, projectName, bundleIdentifier }: AppLookupParams,
    credentials: appleApi.ProvisioningProfile
  ): Promise<void> {
    await this.api.postAsync(`credentials/ios/provisioningProfile/update`, {
      experienceName: `@${accountName}/${projectName}`,
      owner: accountName,
      bundleIdentifier,
      credentials,
    });
  }

  public async deleteProvisioningProfileApi({
    accountName,
    projectName,
    bundleIdentifier,
  }: AppLookupParams): Promise<void> {
    await this.api.postAsync(`credentials/ios/provisioningProfile/delete`, {
      experienceName: `@${accountName}/${projectName}`,
      owner: accountName,
      bundleIdentifier,
    });
  }
}
