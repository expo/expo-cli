import { ApiV2, User } from '@expo/xdl';
import findIndex from 'lodash/findIndex';
import omit from 'lodash/omit';

import log from '../log';
import {
  DistCert,
  PushKey,
  TeamInfo,
  IosCredentials,
  IosAppCredentials,
  IosPushCredentials,
  IosDistCredentials,
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
      log('Fetching available credentials');
      this.credentials = await this.api.getAsync('credentials/ios');
      this.shouldRefetch = false;
    }
    return this.credentials;
  }

  async createDistCert(credentials: TeamInfo & DistCert): Promise<IosDistCredentials> {
    const { id } = await this.api.postAsync('credentials/ios/dist', { credentials });
    const newDistCert: IosDistCredentials = { ...credentials, id, type: 'dist-cert' };
    this.credentials.userCredentials.push(newDistCert);
    return newDistCert;
  }
  async updateDistCert(credentialsId: number, credentials: TeamInfo & DistCert): Promise<IosDistCredentials> {
    const { id } = await this.api.putAsync(`credentials/ios/dist/${credentialsId}`, { credentials });
    const updatedDistCert: IosDistCredentials = { ...credentials, id, type: 'dist-cert' };
    const credIndex = findIndex(this.credentials.userCredentials, ({ id }) => id === credentialsId);
    this.credentials.userCredentials[credIndex] = updatedDistCert;
    return updatedDistCert;
  }
  async deleteDistCert(credentialsId: number) {
    await this.api.deleteAsync(`credentials/ios/dist/${credentialsId}`);
    this.credentials.userCredentials = this.credentials.userCredentials.filter(({ id }) => id !== credentialsId);
    this.credentials.appCredentials = this.credentials.appCredentials.map(record => {
      if (record.distCredentialsId === credentialsId) {
        return omit(record, 'distCredentialsId') as IosAppCredentials;
      }
      return record;
    })
  }
  async useDistCert(experienceName: string, bundleIdentifier: string, userCredentialsId: number) {
    await this.api.postAsync('credentials/ios/use/dist', {
      experienceName, bundleIdentifier, userCredentialsId,
    });
    this._ensureAppCredentials(experienceName, bundleIdentifier);
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier,
    );
    this.credentials.appCredentials[credIndex].distCredentialsId = userCredentialsId;
  }

  async createPushKey(credentials: TeamInfo & PushKey): Promise<IosPushCredentials> {
    const { id } = await this.api.postAsync('credentials/ios/push', { credentials });
    const newPushKey: IosPushCredentials = { ...credentials, id, type: 'push-key' };
    this.credentials.userCredentials.push(newPushKey);
    return newPushKey;
  }
  async updatePushKey(credentialsId: number, credentials: TeamInfo & PushKey): Promise<IosPushCredentials> {
    const { id } = await this.api.putAsync(`credentials/ios/push/${credentialsId}`, {
      credentials
    });
    const updatedPushKey: IosPushCredentials = { ...credentials, id, type: 'push-key' };
    const credIndex = findIndex(this.credentials.userCredentials, ({ id }) => id === credentialsId);
    this.credentials.userCredentials[credIndex] = updatedPushKey;
    return updatedPushKey;
  }
  async deletePushKey(credentialsId: number) {
    await this.api.deleteAsync(`credentials/ios/push/${credentialsId}`);
    this.credentials.userCredentials = this.credentials.userCredentials.filter(({ id }) => id !== credentialsId);
    this.credentials.appCredentials = this.credentials.appCredentials.map(record => {
      if (record.pushCredentialsId === credentialsId) {
        return omit(record, 'pushCredentialsId') as IosAppCredentials;
      }
      return record;
    })
  }
  async usePushKey(experienceName: string, bundleIdentifier: string, userCredentialsId: number) {
    await this.api.postAsync('credentials/ios/use/push', {
      experienceName, bundleIdentifier, userCredentialsId,
    });
    this._ensureAppCredentials(experienceName, bundleIdentifier);
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier,
    );
    this.credentials.appCredentials[credIndex].pushCredentialsId = userCredentialsId;
  }
  async deletePushCert(experienceName: string, bundleIdentifier: string) {
    await this.api.postAsync(`credentials/ios/pushCert/delete`, { experienceName, bundleIdentifier })
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier,
    );
    this.credentials.appCredentials[credIndex].credentials = omit(
      this.credentials.appCredentials[credIndex].credentials,
      ['pushId', 'pushP12', 'pushPassword']
    );
  }
  
  async deleteProvisioningProfile(experienceName: string, bundleIdentifier: string) {
    await this.api.postAsync(`credentials/ios/provisioningProfile/delete`, { experienceName, bundleIdentifier })
    const credIndex = findIndex(
      this.credentials.appCredentials,
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier,
    );
    this.credentials.appCredentials[credIndex].credentials = omit(
      this.credentials.appCredentials[credIndex].credentials,
      ['provisioningProfile', 'provisioningProfileId'],
    );
  } 
  
  _ensureAppCredentials(experienceName: string, bundleIdentifier: string) {
    const exists = this.credentials.appCredentials.filter(
      i => i.experienceName === experienceName && i.bundleIdentifier === bundleIdentifier
    ).length !== 0;
    if (!exists) {
      this.credentials.appCredentials.push({
        experienceName, bundleIdentifier, credentials: {},
      })
    }
  }
}
