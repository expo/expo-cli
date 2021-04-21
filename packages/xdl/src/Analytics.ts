import Segment from 'analytics-node';
import os from 'os';

import { ip } from './internal';

const PLATFORM_TO_ANALYTICS_PLATFORM: { [platform: string]: string } = {
  darwin: 'Mac',
  win32: 'Windows',
  linux: 'Linux',
};

export class AnalyticsClient {
  private userTraits: any;
  private segmentNodeInstance: Segment | undefined;
  private _userId: string | undefined;
  private _version: string | undefined;

  public get userId() {
    return this._userId;
  }

  public get version() {
    return this._version;
  }

  public flush() {
    if (this.segmentNodeInstance) {
      this.segmentNodeInstance.flush();
    }
  }

  public initializeClient(apiKey: string, packageVersion: string) {
    // Do not wait before flushing, we want node to close immediately if the programs ends
    this.segmentNodeInstance = new Segment(apiKey, { flushInterval: 300 });
    this._version = packageVersion;
  }

  public identifyUser(userId: string, traits: any) {
    this._userId = userId;
    this.userTraits = traits;

    if (this.segmentNodeInstance) {
      this.segmentNodeInstance.identify({
        userId: this._userId,
        traits: this.userTraits,
        context: this.getContext(),
      });
    }
  }

  public logEvent(name: string, properties: any = {}) {
    if (this.segmentNodeInstance && this._userId) {
      this.segmentNodeInstance.track({
        userId: this._userId,
        event: name,
        properties,
        context: this.getContext(),
      });
    }
  }

  private getContext() {
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
