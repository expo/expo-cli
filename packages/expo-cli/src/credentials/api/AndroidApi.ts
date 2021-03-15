import keyBy from 'lodash/keyBy';
import { ApiV2 } from 'xdl';

import { AndroidCredentials, FcmCredentials, Keystore } from '../credentials';
import ApiClient from './AndroidApiV2Wrapper';

export default class AndroidApi {
  private client: ApiClient;
  private shouldRefetchAll: boolean = true;
  private credentials: { [key: string]: AndroidCredentials } = {};

  constructor(api: ApiV2) {
    this.client = new ApiClient(api);
  }

  public async fetchAll(): Promise<{ [key: string]: AndroidCredentials }> {
    if (this.shouldRefetchAll) {
      this.credentials = keyBy(await this.client.getAllCredentialsApi(), 'experienceName');
      this.shouldRefetchAll = false;
    }
    return this.credentials;
  }

  public async fetchKeystore(experienceName: string): Promise<Keystore | null> {
    await this.ensureCredentialsFetched(experienceName);
    return this.credentials[experienceName]?.keystore || null;
  }

  public async fetchCredentials(experienceName: string): Promise<AndroidCredentials> {
    await this.ensureCredentialsFetched(experienceName);
    return this.credentials[experienceName];
  }

  public async updateKeystore(experienceName: string, keystore: Keystore): Promise<void> {
    await this.ensureCredentialsFetched(experienceName);
    await this.client.updateKeystoreApi(experienceName, keystore);
    this.credentials[experienceName] = {
      experienceName,
      keystore,
      pushCredentials: this.credentials[experienceName]?.pushCredentials,
    };
  }

  public async fetchFcmKey(experienceName: string): Promise<FcmCredentials | null> {
    await this.ensureCredentialsFetched(experienceName);
    return this.credentials?.[experienceName]?.pushCredentials;
  }

  public async updateFcmKey(experienceName: string, fcmApiKey: string): Promise<void> {
    await this.ensureCredentialsFetched(experienceName);
    await this.client.updateFcmKeyApi(experienceName, fcmApiKey);
    this.credentials[experienceName] = {
      experienceName,
      keystore: this.credentials[experienceName]?.keystore,
      pushCredentials: { fcmApiKey },
    };
  }

  public async removeFcmKey(experienceName: string): Promise<void> {
    await this.ensureCredentialsFetched(experienceName);
    await this.client.removeFcmKeyApi(experienceName);
    if (this.credentials[experienceName]) {
      this.credentials[experienceName].pushCredentials = null;
    }
  }

  public async removeKeystore(experienceName: string): Promise<void> {
    await this.ensureCredentialsFetched(experienceName);
    await this.client.removeKeystoreApi(experienceName);
    if (this.credentials[experienceName]) {
      this.credentials[experienceName].keystore = null;
    }
  }

  private async ensureCredentialsFetched(experienceName: string): Promise<void> {
    if (!this.credentials[experienceName]) {
      const response = await this.client.getAllCredentialsForAppApi(experienceName);
      this.credentials[experienceName] = {
        experienceName,
        keystore: response?.keystore,
        pushCredentials: response?.pushCredentials,
      };
    }
  }
}
