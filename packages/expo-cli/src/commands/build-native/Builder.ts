import os from 'os';
import path from 'path';

import { Platform } from '@expo/config';
import { TurtleApi, User } from '@expo/xdl';
import fs from 'fs-extra';
import ora from 'ora';
import uuidv4 from 'uuid/v4';

import { Options, prepareJob } from './prepare';
import { makeProjectTarball, waitForBuildEnd } from './utils';

export interface StatusResult {
  builds: BuildInfo[];
}

export interface BuildInfo {
  status: string;
  platform: Platform;
  createdAt: string;
  artifacts?: BuildArtifacts;
}

interface BuildArtifacts {
  buildUrl?: string;
  logsUrl: string;
}

export default class Builder {
  client: TurtleApi;

  constructor(user: User) {
    this.client = TurtleApi.clientForUser(user.sessionSecret);
  }

  async buildProject(projectDir: string, options: Options) {
    const tarPath = path.join(os.tmpdir(), `${uuidv4()}.tar.gz`);
    try {
      await makeProjectTarball(tarPath);
      const spinner = ora('Uploading project to server.').start();
      const { s3Url } = await this.client.uploadFile(tarPath);
      spinner.succeed('Project uploaded.');
      const job = await prepareJob(options, s3Url, projectDir);
      const response = await this.client.postAsync('builds', job);
      return await waitForBuildEnd(this.client, response.buildId);
    } finally {
      await fs.remove(tarPath);
    }
  }

  async getLatestBuilds(): Promise<StatusResult> {
    return await this.client.getAsync('builds');
  }
}
