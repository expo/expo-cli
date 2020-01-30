import { ApiV2, User } from '@expo/xdl';
import findIndex from 'lodash/findIndex';
import find from 'lodash/find';
import omit from 'lodash/omit';
import assign from 'lodash/assign';
import get from 'lodash/get';

import log from '../log';
import * as appleApi from '../appleApi';
import {
  IosAppCredentials,
  IosCredentials,
  IosDistCredentials,
  IosPushCredentials,
} from './credentials';

export class IosApi {
  api: ApiV2;
  credentials: IosCredentials;
  shouldRefetch: boolean = true;

  constructor(user: User) {
    this.api = ApiV2.clientForUser(user);
    this.credentials = { appCredentials: [], userCredentials: [] };
  }

  async getAllCredentials(): Promise<IosCredentials> {
    if (this.shouldRefetch) {
      await this._fetchAllCredentials();
    }
    return this.credentials;
  }

  async _fetchAllCredentials() {
    log('Fetching available credentials');
    this.credentials = await this.api.getAsync('credentials/ios');
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
    const distCertId = this.credentials.appCredentials[credIndex].distCredentialsId;
    if (!distCertId) {
      return null;
    }
    const distCert = this.credentials.userCredentials.find(cred => cred.id === distCertId) as
      | IosDistCredentials
      | undefined;
    return distCert || null;
  }

  async createDistCert(credentials: appleApi.DistCert): Promise<IosDistCredentials> {
    const { id } = await this.api.postAsync('credentials/ios/dist', { credentials });
    const newDistCert: IosDistCredentials = { ...credentials, id, type: 'dist-cert' };
    this.credentials.userCredentials.push(newDistCert);
    return newDistCert;
  }
  async updateDistCert(
    credentialsId: number,
    credentials: appleApi.DistCert
  ): Promise<IosDistCredentials> {
    const { id } = await this.api.putAsync(`credentials/ios/dist/${credentialsId}`, {
      credentials,
    });
    const updatedDistCert: IosDistCredentials = { ...credentials, id, type: 'dist-cert' };
    const credIndex = findIndex(this.credentials.userCredentials, ({ id }) => id === credentialsId);
    this.credentials.userCredentials[credIndex] = updatedDistCert;
    return updatedDistCert;
  }
  async deleteDistCert(credentialsId: number) {
    await this.api.deleteAsync(`credentials/ios/dist/${credentialsId}`);
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
  async useDistCert(experienceName: string, bundleIdentifier: string, userCredentialsId: number) {
    await this.api.postAsync('credentials/ios/use/dist', {
      experienceName,
      bundleIdentifier,
      userCredentialsId,
    });
    this._ensureAppCredentials(experienceName, bundleIdentifier);
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier
    );
    this.credentials.appCredentials[credIndex].distCredentialsId = userCredentialsId;
  }

  async createPushKey(credentials: appleApi.PushKey): Promise<IosPushCredentials> {
    const { id } = await this.api.postAsync('credentials/ios/push', { credentials });
    const newPushKey: IosPushCredentials = { ...credentials, id, type: 'push-key' };
    this.credentials.userCredentials.push(newPushKey);
    return newPushKey;
  }
  async updatePushKey(
    credentialsId: number,
    credentials: appleApi.PushKey
  ): Promise<IosPushCredentials> {
    const { id } = await this.api.putAsync(`credentials/ios/push/${credentialsId}`, {
      credentials,
    });
    const updatedPushKey: IosPushCredentials = { ...credentials, id, type: 'push-key' };
    const credIndex = findIndex(this.credentials.userCredentials, ({ id }) => id === credentialsId);
    this.credentials.userCredentials[credIndex] = updatedPushKey;
    return updatedPushKey;
  }
  async deletePushKey(credentialsId: number) {
    await this.api.deleteAsync(`credentials/ios/push/${credentialsId}`);
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
  async usePushKey(experienceName: string, bundleIdentifier: string, userCredentialsId: number) {
    await this.api.postAsync('credentials/ios/use/push', {
      experienceName,
      bundleIdentifier,
      userCredentialsId,
    });
    this._ensureAppCredentials(experienceName, bundleIdentifier);
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier
    );
    this.credentials.appCredentials[credIndex].pushCredentialsId = userCredentialsId;
  }
  async deletePushCert(experienceName: string, bundleIdentifier: string) {
    await this.api.postAsync(`credentials/ios/pushCert/delete`, {
      experienceName,
      bundleIdentifier,
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

  async updateProvisioningProfile(
    experienceName: string,
    bundleIdentifier: string,
    provisioningProfile: appleApi.ProvisioningProfile,
    appleTeam: appleApi.Team
  ): Promise<appleApi.ProvisioningProfile> {
    await this.api.postAsync(`credentials/ios/provisioningProfile/update`, {
      experienceName,
      bundleIdentifier,
      credentials: { ...provisioningProfile, teamId: appleTeam.id, teamName: appleTeam.name },
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
    const provisioningProfileId = get(appCredentials, 'credentials.provisioningProfileId');
    const provisioningProfile = get(appCredentials, 'credentials.provisioningProfile');
    if (!provisioningProfileId || !provisioningProfile) {
      return null;
    }
    return { provisioningProfileId, provisioningProfile };
  }

  async deleteProvisioningProfile(experienceName: string, bundleIdentifier: string) {
    await this.api.postAsync(`credentials/ios/provisioningProfile/delete`, {
      experienceName,
      bundleIdentifier,
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
