import { ApiV2, User } from '@expo/xdl';
import keyBy from 'lodash/keyBy';

import { AndroidCredentials, Keystore } from '../credentials';

export class AndroidApi {
  private api: ApiV2;
  private shouldRefetchAll: boolean = true;
  private credentials: { [key: string]: AndroidCredentials } = {};

  constructor(user: User) {
    this.api = ApiV2.clientForUser(user);
  }

  public withApiClient(client: ApiV2) {
    this.api = client;
    return this;
  }

  public async fetchAll(): Promise<{ [key: string]: AndroidCredentials }> {
    if (this.shouldRefetchAll) {
      this.credentials = keyBy(
        (await this.api.getAsync('credentials/android'))?.credentials || [],
        'experienceName'
      );
      this.shouldRefetchAll = false;
    }
    return this.credentials;
  }

  public async fetchKeystore(experienceName: string): Promise<Keystore | null> {
    await this._ensureCredentialsFetched(experienceName);
    return this.credentials[experienceName]?.keystore || null;
  }

  public async fetchCredentials(experienceName: string): Promise<AndroidCredentials> {
    await this._ensureCredentialsFetched(experienceName);
    return this.credentials[experienceName];
  }

  public async updateKeystore(experienceName: string, keystore: Keystore): Promise<void> {
    await this._ensureCredentialsFetched(experienceName);
    await this.api.putAsync(`credentials/android/keystore/${experienceName}`, { keystore });
    this.credentials[experienceName] = {
      experienceName,
      keystore,
      pushCredentials: this.credentials[experienceName]?.pushCredentials,
    };
  }

  public async updateFcmKey(experienceName: string, fcmApiKey: string): Promise<void> {
    await this._ensureCredentialsFetched(experienceName);
    await this.api.putAsync(`credentials/android/push/${experienceName}`, { fcmApiKey });
    this.credentials[experienceName] = {
      experienceName,
      keystore: this.credentials[experienceName]?.keystore,
      pushCredentials: { fcmApiKey },
    };
  }

  public async removeKeystore(experienceName: string): Promise<void> {
    await this._ensureCredentialsFetched(experienceName);
    await this.api.deleteAsync(`credentials/android/keystore/${experienceName}`);
    if (this.credentials[experienceName]) {
      this.credentials[experienceName].keystore = null;
    }
  }

  private async _ensureCredentialsFetched(experienceName: string): Promise<void> {
    if (!this.credentials[experienceName]) {
      const response = await this.api.getAsync(`credentials/android/${experienceName}`);
      this.credentials[experienceName] = {
        experienceName,
        keystore: response?.keystore,
        pushCredentials: response?.pushCredentials,
      };
    }
  }
}
