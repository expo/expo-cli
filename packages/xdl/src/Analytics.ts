import Segment from 'analytics-node';
import os from 'os';

import { ip } from './internal';

const PLATFORM_TO_ANALYTICS_PLATFORM: { [platform: string]: string } = {
  darwin: 'Mac',
  win32: 'Windows',
  linux: 'Linux',
};

export class AnalyticsClient {
  private _userId: string | undefined;
  private _userTraits: any;
  private _segmentNodeInstance: Segment | undefined;
  private _version: string | undefined;

  public get version() {
    return this._version;
  }

  public get userId() {
    return this._userId;
  }

  public flush() {
    if (this._segmentNodeInstance) {
      this._segmentNodeInstance.flush();
    }
  }

  public setSegmentNodeKey(key: string) {
    // Do not wait before flushing, we want node to close immediately if the programs ends
    this._segmentNodeInstance = new Segment(key, { flushInterval: 300 });
  }

  public identifyUser(userId: string, traits: any) {
    this._userId = userId;
    this._userTraits = traits;

    if (this._segmentNodeInstance) {
      this._segmentNodeInstance.identify({
        userId: this._userId,
        traits: this._userTraits,
        context: this.getContext(),
      });
    }
  }

  public setVersionName(version: string) {
    this._version = version;
  }

  public logEvent(name: string, properties: any = {}) {
    if (this._segmentNodeInstance && this._userId) {
      this._segmentNodeInstance.track({
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
