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
  private segmentNodeInstance: Segment | undefined;
  private version: string | undefined;

  public get Verion() {
    return this.version;
  }

  public get UserId() {
    return this._userId;
  }

  public flush() {
    if (this.segmentNodeInstance) {
      this.segmentNodeInstance.flush();
    }
  }

  public setSegmentNodeKey(key: string) {
    // Do not wait before flushing, we want node to close immediately if the programs ends
    this.segmentNodeInstance = new Segment(key, { flushInterval: 300 });
  }

  public setUserProperties(userId: string, traits: any) {
    this._userId = userId;
    this._userTraits = traits;

    this.ensureUserIdentified();
  }

  public setVersionName(version: string) {
    this.version = version;
  }

  public logEvent(name: string, properties: any = {}) {
    if (this.segmentNodeInstance && this._userId) {
      this.ensureUserIdentified();
      this.segmentNodeInstance.track({
        userId: this._userId,
        event: name,
        properties,
        context: this.getContext(),
      });
    }
  }

  private ensureUserIdentified() {
    if (this.segmentNodeInstance && !this.userIdentifyCalled && this._userId) {
      this.segmentNodeInstance.identify({
        userId: this._userId,
        traits: this._userTraits,
        context: this.getContext(),
      });
      this.userIdentifyCalled = true;
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

    if (this.version) {
      context.app = {
        version: this.version,
      };
    }

    return context;
  }
}

const defaultClient = new AnalyticsClient();

export default defaultClient;
