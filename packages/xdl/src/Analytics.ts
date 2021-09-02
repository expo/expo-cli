import RudderAnalytics from '@expo/rudder-sdk-node';
import os from 'os';
import { URL } from 'url';

import { ip } from './internal';

const PLATFORM_TO_ANALYTICS_PLATFORM: { [platform: string]: string } = {
  darwin: 'Mac',
  win32: 'Windows',
  linux: 'Linux',
};

export class AnalyticsClient {
  private userTraits?: { [key: string]: any };
  private rudderstackClient?: RudderAnalytics;
  private _userId?: string;
  private _version?: string;

  public get userId() {
    return this._userId;
  }

  public get version() {
    return this._version;
  }

  public flush() {
    if (this.rudderstackClient) {
      this.rudderstackClient.flush();
    }
  }

  public initializeClient(
    rudderstackWriteKey: string,
    rudderstackDataPlaneURL: string,
    packageVersion: string
  ) {
    // Do not wait before flushing, we want node to close immediately if the programs ends
    this.rudderstackClient = new RudderAnalytics(
      rudderstackWriteKey,
      new URL('/v1/batch', rudderstackDataPlaneURL).toString(),
      {
        flushInterval: 300,
      }
    );
    this.rudderstackClient.logger.silent = true;
    this._version = packageVersion;
  }

  public identifyUser(userId: string, traits: { [key: string]: any }) {
    this._userId = userId;
    this.userTraits = traits;

    if (this.rudderstackClient) {
      this.rudderstackClient.identify({
        userId: this._userId,
        traits: this.userTraits,
        context: this.getContext(),
      });
    }
  }

  public logEvent(name: string, properties: any = {}) {
    if (this.rudderstackClient && this._userId) {
      this.rudderstackClient.track({
        userId: this._userId,
        event: name,
        properties,
        context: this.getContext(),
      });
    }
  }

  private getContext(): any {
    const platform = PLATFORM_TO_ANALYTICS_PLATFORM[os.platform()] || os.platform();
    const context = {
      ip: ip.address(),
      device: {
        model: platform,
        brand: platform,
      },
      os: {
        name: platform,
        version: os.release(),
      },
      app: {},
    };

    if (this._version) {
      context.app = {
        version: this._version,
      };
    }

    return context;
  }
}

const defaultClient = new AnalyticsClient();

export default defaultClient;
