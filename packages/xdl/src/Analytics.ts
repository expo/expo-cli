import Segment from 'analytics-node';
import os from 'os';

import { ip } from './internal';

const PLATFORM_TO_ANALYTICS_PLATFORM: { [platform: string]: string } = {
  darwin: 'Mac',
  win32: 'Windows',
  linux: 'Linux',
};

let _userId: string | undefined;
let _userTraits: any;

export class AnalyticsClient {
  private segmentNodeInstance: Segment | undefined;
  private version: string | undefined;
  private userIdentifyCalled: boolean = false;
  public get Version() {
    return this.version;
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
    _userId = userId;
    _userTraits = traits;

    this.ensureUserIdentified();
  }

  public setVersionName(version: string) {
    this.version = version;
  }

  public logEvent(name: string, properties: any = {}) {
    if (this.segmentNodeInstance && _userId) {
      this.ensureUserIdentified();
      this.segmentNodeInstance.track({
        userId: _userId,
        event: name,
        properties,
        context: this.getContext(),
      });
    }
  }

  private ensureUserIdentified() {
    if (this.segmentNodeInstance && !this.userIdentifyCalled && _userId) {
      this.segmentNodeInstance.identify({
        userId: _userId,
        traits: _userTraits,
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

const unifiedApiKey =
  process.env.NODE_ENV === 'production' // should i be using getenv?
    ? 'u4e9dmCiNpwIZTXuyZPOJE7KjCMowdx5'
    : 'Q3hdBJCQ6ugs42gmWyxcvAV2tRgr3tZd';
const AnalyticsUnified = new AnalyticsClient();
AnalyticsUnified.setSegmentNodeKey(unifiedApiKey);
export { AnalyticsUnified };

const defaultClient = new AnalyticsClient();
export default defaultClient;
