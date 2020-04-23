import { ApiV2, User } from '@expo/xdl';
import findIndex from 'lodash/findIndex';
import find from 'lodash/find';
import omit from 'lodash/omit';
import assign from 'lodash/assign';
import get from 'lodash/get';
import pick from 'lodash/pick';

import invariant from 'invariant';
import log from '../log';
import * as appleApi from '../appleApi';
import {
  IosAppCredentials,
  IosCredentials,
  IosDistCredentials,
  IosPushCredentials,
} from './credentials';
import { Context } from './context';

type CredentialFields = {
  credentials: { [key: string]: any };
};

type CredentialLookupParameters = {
  owner: string;
};

type AppLookupParameters = {
  bundleIdentifier: string;
  experienceName: string;
} & CredentialLookupParameters;

type UploadUserCredentialParameters = CredentialFields & CredentialLookupParameters;
type UploadAppCredentialParameters = CredentialFields & AppLookupParameters;

export class IosApi {
  api: ApiV2;
  username: string;
  credentials: IosCredentials;
  shouldRefetch: boolean = true;

  constructor(user: User) {
    this.api = ApiV2.clientForUser(user);
    this.username = user.username;
    this.credentials = { appCredentials: [], userCredentials: [] };
  }

  withProjectContext(ctx: Context): IosApi {
    invariant(ctx.hasProjectContext, 'Project context required');
    this.username = ctx.manifest.owner ?? this.username;
    return this;
  }

  withApiClient(apiClient: ApiV2) {
    this.api = apiClient;
    return this;
  }

  async getAllCredentials(): Promise<IosCredentials> {
    if (this.shouldRefetch) {
      await this._fetchAllCredentials();
    }
    return this.credentials;
  }

  async _fetchAllCredentialsApi(credentialLookupParameters: CredentialLookupParameters) {
    return await this.api.getAsync('credentials/ios', credentialLookupParameters);
  }
  async _fetchAllCredentials() {
    log('Fetching available credentials');
    this.credentials = await this._fetchAllCredentialsApi({ owner: this.username });
    this.shouldRefetch = false;
  }

  async getDistCert(
    experienceName: string,
    bundleIdentifier: string
  ): Promise<IosDistCredentials | null> {
    if (this.shouldRefetch) {
      await this._fetchAllCredentials();
    }
    this._ensureAppCredentials(experienceName, bundleIdentifier);
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier
    );
    const distCertExpoId = this.credentials.appCredentials[credIndex].distCredentialsId;
    if (!distCertExpoId) {
      return null;
    }
    const distCert = this.credentials.userCredentials.find(cred => cred.id === distCertExpoId) as
      | IosDistCredentials
      | undefined;
    return distCert || null;
  }

  async _createDistCertApi(uploadUserCredentialParameters: UploadUserCredentialParameters) {
    return await this.api.postAsync('credentials/ios/dist', uploadUserCredentialParameters);
  }
  async createDistCert(credentials: appleApi.DistCert): Promise<IosDistCredentials> {
    const { id } = await this._createDistCertApi({
      credentials,
      owner: this.username,
    });
    const newDistCert: IosDistCredentials = { ...credentials, id, type: 'dist-cert' };
    this.credentials.userCredentials.push(newDistCert);
    return newDistCert;
  }

  async _updateDistCertApi(
    credentialsId: number,
    uploadUserCredentialParameters: UploadUserCredentialParameters
  ) {
    return await this.api.putAsync(
      `credentials/ios/dist/${credentialsId}`,
      uploadUserCredentialParameters
    );
  }
  async updateDistCert(
    credentialsId: number,
    credentials: appleApi.DistCert
  ): Promise<IosDistCredentials> {
    const { id } = await this._updateDistCertApi(credentialsId, {
      credentials,
      owner: this.username,
    });
    const updatedDistCert: IosDistCredentials = { ...credentials, id, type: 'dist-cert' };
    const credIndex = findIndex(this.credentials.userCredentials, ({ id }) => id === credentialsId);
    this.credentials.userCredentials[credIndex] = updatedDistCert;
    return updatedDistCert;
  }

  async _deleteDistCertApi(
    credentialsId: number,
    credentialLookupParameters: CredentialLookupParameters
  ): Promise<void> {
    await this.api.deleteAsync(`credentials/ios/dist/${credentialsId}`, credentialLookupParameters);
  }
  async deleteDistCert(credentialsId: number) {
    await this._deleteDistCertApi(credentialsId, { owner: this.username });
    this.credentials.userCredentials = this.credentials.userCredentials.filter(
      ({ id }) => id !== credentialsId
    );
    this.credentials.appCredentials = this.credentials.appCredentials.map(record => {
      if (record.distCredentialsId === credentialsId) {
        return omit(record, 'distCredentialsId') as IosAppCredentials;
      }
      return record;
    });
  }

  async _useDistCertApi(
    userCredentialsId: number,
    appLookupParameters: AppLookupParameters
  ): Promise<void> {
    await this.api.postAsync('credentials/ios/use/dist', {
      ...appLookupParameters,
      userCredentialsId,
    });
  }
  async useDistCert(experienceName: string, bundleIdentifier: string, userCredentialsId: number) {
    await this._useDistCertApi(userCredentialsId, {
      experienceName,
      bundleIdentifier,
      owner: this.username,
    });
    this._ensureAppCredentials(experienceName, bundleIdentifier);
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier
    );
    this.credentials.appCredentials[credIndex].distCredentialsId = userCredentialsId;
  }

  async _createPushKeyApi(uploadUserCredentialParameters: UploadUserCredentialParameters) {
    return await this.api.postAsync('credentials/ios/push', uploadUserCredentialParameters);
  }
  async createPushKey(credentials: appleApi.PushKey): Promise<IosPushCredentials> {
    const { id } = await this._createPushKeyApi({
      credentials,
      owner: this.username,
    });
    const newPushKey: IosPushCredentials = { ...credentials, id, type: 'push-key' };
    this.credentials.userCredentials.push(newPushKey);
    return newPushKey;
  }

  async _updatePushKeyApi(
    credentialsId: number,
    uploadUserCredentialParameters: UploadUserCredentialParameters
  ) {
    return await this.api.putAsync(
      `credentials/ios/push/${credentialsId}`,
      uploadUserCredentialParameters
    );
  }
  async updatePushKey(
    credentialsId: number,
    credentials: appleApi.PushKey
  ): Promise<IosPushCredentials> {
    const { id } = await this._updatePushKeyApi(credentialsId, {
      credentials,
      owner: this.username,
    });
    const updatedPushKey: IosPushCredentials = { ...credentials, id, type: 'push-key' };
    const credIndex = findIndex(this.credentials.userCredentials, ({ id }) => id === credentialsId);
    this.credentials.userCredentials[credIndex] = updatedPushKey;
    return updatedPushKey;
  }

  async _deletePushKeyApi(
    credentialsId: number,
    credentialLookupParameters: CredentialLookupParameters
  ): Promise<void> {
    await this.api.deleteAsync(`credentials/ios/push/${credentialsId}`, credentialLookupParameters);
  }
  async deletePushKey(credentialsId: number) {
    await this._deletePushKeyApi(credentialsId, { owner: this.username });
    this.credentials.userCredentials = this.credentials.userCredentials.filter(
      ({ id }) => id !== credentialsId
    );
    this.credentials.appCredentials = this.credentials.appCredentials.map(record => {
      if (record.pushCredentialsId === credentialsId) {
        return omit(record, 'pushCredentialsId') as IosAppCredentials;
      }
      return record;
    });
  }
  async getPushKey(
    experienceName: string,
    bundleIdentifier: string
  ): Promise<IosPushCredentials | null> {
    if (this.shouldRefetch) {
      await this._fetchAllCredentials();
    }
    this._ensureAppCredentials(experienceName, bundleIdentifier);
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier
    );
    const pushKeyId = this.credentials.appCredentials[credIndex].pushCredentialsId;
    if (!pushKeyId) {
      return null;
    }
    const pushKey = this.credentials.userCredentials.find(cred => cred.id === pushKeyId) as
      | IosPushCredentials
      | undefined;
    return pushKey || null;
  }

  async _usePushKeyApi(
    userCredentialsId: number,
    appLookupParameters: AppLookupParameters
  ): Promise<void> {
    await this.api.postAsync('credentials/ios/use/push', {
      ...appLookupParameters,
      userCredentialsId,
    });
  }
  async usePushKey(experienceName: string, bundleIdentifier: string, userCredentialsId: number) {
    await this._usePushKeyApi(userCredentialsId, {
      experienceName,
      bundleIdentifier,
      owner: this.username,
    });
    this._ensureAppCredentials(experienceName, bundleIdentifier);
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier
    );
    this.credentials.appCredentials[credIndex].pushCredentialsId = userCredentialsId;
  }
  async getPushCert(
    experienceName: string,
    bundleIdentifier: string
  ): Promise<{ pushId: string; pushP12: string; pushPassword: string } | null> {
    const appCredentials = await this.getAppCredentials(experienceName, bundleIdentifier);
    const pushId = get(appCredentials, 'credentials.pushId');
    const pushP12 = get(appCredentials, 'credentials.pushP12');
    const pushPassword = get(appCredentials, 'credentials.pushPassword');
    if (!pushId || !pushP12 || !pushPassword) {
      return null;
    }
    return { pushId, pushP12, pushPassword };
  }

  async _deletePushCertApi(appLookupParameters: AppLookupParameters): Promise<void> {
    await this.api.postAsync(`credentials/ios/pushCert/delete`, appLookupParameters);
  }
  async deletePushCert(experienceName: string, bundleIdentifier: string) {
    await this._deletePushCertApi({
      experienceName,
      bundleIdentifier,
      owner: this.username,
    });
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier
    );
    this.credentials.appCredentials[credIndex].credentials = omit(
      this.credentials.appCredentials[credIndex].credentials,
      ['pushId', 'pushP12', 'pushPassword']
    );
  }

  async _updateProvisioningProfileApi(
    uploadAppCredentialParameters: UploadAppCredentialParameters
  ): Promise<void> {
    await this.api.postAsync(
      `credentials/ios/provisioningProfile/update`,
      uploadAppCredentialParameters
    );
  }
  async updateProvisioningProfile(
    experienceName: string,
    bundleIdentifier: string,
    provisioningProfile: appleApi.ProvisioningProfile,
    appleTeam: Pick<appleApi.Team, 'id'>
  ): Promise<appleApi.ProvisioningProfile> {
    await this._updateProvisioningProfileApi({
      experienceName,
      bundleIdentifier,
      credentials: { ...provisioningProfile, teamId: appleTeam.id },
      owner: this.username,
    });
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier
    );
    assign(this.credentials.appCredentials[credIndex].credentials, provisioningProfile);
    return provisioningProfile;
  }

  async getAppCredentials(
    experienceName: string,
    bundleIdentifier: string
  ): Promise<IosAppCredentials> {
    if (this.shouldRefetch) {
      await this._fetchAllCredentials();
    }
    this._ensureAppCredentials(experienceName, bundleIdentifier);
    return find(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier
    )!;
  }

  async getProvisioningProfile(
    experienceName: string,
    bundleIdentifier: string
  ): Promise<appleApi.ProvisioningProfile | null> {
    const appCredentials = await this.getAppCredentials(experienceName, bundleIdentifier);
    const provisioningProfile = get(appCredentials, 'credentials.provisioningProfile');
    if (!provisioningProfile) {
      return null;
    }
    return pick(appCredentials.credentials, [
      'provisioningProfile',
      'provisioningProfileId',
    ]) as appleApi.ProvisioningProfile;
  }

  async _deleteProvisioningProfileApi(appLookupParameters: AppLookupParameters): Promise<void> {
    await this.api.postAsync(`credentials/ios/provisioningProfile/delete`, appLookupParameters);
  }
  async deleteProvisioningProfile(experienceName: string, bundleIdentifier: string) {
    await this._deleteProvisioningProfileApi({
      experienceName,
      bundleIdentifier,
      owner: this.username,
    });
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier
    );
    this.credentials.appCredentials[credIndex].credentials = omit(
      this.credentials.appCredentials[credIndex].credentials,
      ['provisioningProfile', 'provisioningProfileId']
    );
  }

  _ensureAppCredentials(experienceName: string, bundleIdentifier: string) {
    const exists =
      this.credentials.appCredentials.filter(
        i => i.experienceName === experienceName && i.bundleIdentifier === bundleIdentifier
      ).length !== 0;
    if (!exists) {
      this.credentials.appCredentials.push({
        experienceName,
        bundleIdentifier,
        credentials: {},
      });
    }
  }
}
