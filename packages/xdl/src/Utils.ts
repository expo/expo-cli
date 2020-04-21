import { ncp } from 'ncp';
import path from 'path';
import { JSONObject } from '@expo/json-file';
import { Cacher } from './tools/FsCache';

import { ApiV2 } from './xdl';

export function ncpAsync(source: string, dest: string, options: any = {}) {
  return new Promise((resolve, reject) => {
    ncp(source, dest, options, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export class Semaphore {
  queue: Array<(v: boolean) => void> = [];
  available = 1;

  async acquire(): Promise<boolean> {
    if (this.available > 0) {
      this.available -= 1;
      return Promise.resolve(true);
    }

    // If there is no permit available, we return a promise that resolves once the semaphore gets
    // signaled enough times that "available" is equal to one.
    return new Promise(resolver => this.queue.push(resolver));
  }

  release() {
    this.available += 1;

    if (this.available > 1 && this.queue.length > 0) {
      throw new Error('this.available should never be > 0 when there is someone waiting.');
    } else if (this.available === 1 && this.queue.length > 0) {
      // If there is someone else waiting, immediately consume the permit that was released
      // at the beginning of this function and let the waiting function resume.
      this.available -= 1;

      const nextResolver = this.queue.shift();
      if (nextResolver) {
        nextResolver(true);
      }
    }
  }
}

export class XdlSchemaClient {
  static _schemaCaches: { [version: string]: Cacher<JSONObject> } = {};

  static async getAsync(sdkVersion: string): Promise<JSONObject> {
    if (!XdlSchemaClient._schemaCaches.hasOwnProperty(sdkVersion)) {
      XdlSchemaClient._schemaCaches[sdkVersion] = new Cacher(
        async () => {
          return await new ApiV2().getAsync(`project/configuration/schema/${sdkVersion}`);
        },
        `schema-${sdkVersion}.json`,
        0,
        path.join(__dirname, `../caches/schema-${sdkVersion}.json`)
      );
    }

    return await XdlSchemaClient._schemaCaches[sdkVersion].getAsync();
  }
}
