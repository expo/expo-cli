import { Platform } from '@expo/config';
import { TurtleApi, User } from '@expo/xdl';
import fs from 'fs-extra';
import uuidv4 from 'uuid/v4';

import { getUserData, Options } from './prepare';
import { makeProjectTarball, waitForBuildEnd } from './utils';

export interface StatusResult {
  builds: BuildInfo[];
}

export interface BuildInfo {
  status: string,
  platform: Platform,
  createdAt: string,
  artifacts?: { s3Url: string };
}

export default class Builder {
  client: TurtleApi;

  constructor(user?: User) {
    this.client = TurtleApi.clientForUser(user);
  }

  async buildProject(projectDir: string, options: Options) {
    const tarName = `${uuidv4()}-project`;
    const tarPath = `/tmp/${tarName}`;
    try {
      await makeProjectTarball(tarPath);
      const uploadResponse = await this.client.uploadFile(tarPath);
      const s3Url = uploadResponse.s3Url;
      const data = await getUserData(options, s3Url, projectDir);
      const response = await this.client.postAsync('build/start', data);
      return await waitForBuildEnd(this.client, response.buildId);
    } finally {
      if (await fs.pathExists(tarPath)) {
        await fs.unlink(tarPath);
      }
    }
  }

  async getLatestBuilds(): Promise<StatusResult> {
    return await this.client.getAsync('build/status');
  }

}
