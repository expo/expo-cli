import { ApiV2 } from '@expo/api';

import { AndroidCredentials, Keystore } from '../credentials';

type AllCredentialsApiResponse = AndroidCredentials[];

// This class should not be used directly, use only as part of cached api client from ./AndroidApi.ts
// or mock it in tests (it's easier to mock this class than ApiV2 directly)
export default class ApiClient {
  constructor(private api: ApiV2) {}

  public async getAllCredentialsApi(): Promise<AllCredentialsApiResponse> {
    return (await this.api.getAsync('credentials/android'))?.credentials || [];
  }
  public async getAllCredentialsForAppApi(experienceName: string): Promise<AndroidCredentials> {
    return await this.api.getAsync(`credentials/android/${experienceName}`);
  }
  public async updateKeystoreApi(experienceName: string, keystore: Keystore): Promise<void> {
    return await this.api.putAsync(`credentials/android/keystore/${experienceName}`, { keystore });
  }
  public async updateFcmKeyApi(experienceName: string, fcmApiKey: string): Promise<void> {
    return await this.api.putAsync(`credentials/android/push/${experienceName}`, { fcmApiKey });
  }
  public async removeKeystoreApi(experienceName: string): Promise<void> {
    await this.api.deleteAsync(`credentials/android/keystore/${experienceName}`);
  }
  public async removeFcmKeyApi(experienceName: string): Promise<void> {
    await this.api.deleteAsync(`credentials/android/push/${experienceName}`);
  }
}
