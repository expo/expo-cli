import os from 'os';
import path from 'path';

import { Platform, prepareJob } from '@expo/build-tools';
import { TurtleApi, User } from '@expo/xdl';
import fs from 'fs-extra';
import ora from 'ora';
import uuidv4 from 'uuid/v4';

import { getLogsUrl, makeProjectTarball, waitForBuildEnd } from './utils';
import log from '../../log';

export interface StatusResult {
  builds: BuildInfo[];
}

export interface Options {
  platform: Platform;
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

      const job = await prepareJob(options.platform, s3Url, projectDir);
      const { buildId } = await this.client.postAsync('builds', job);

      log(`Build logs: ${getLogsUrl(buildId)}`);

      return await waitForBuildEnd(this.client, buildId);
    } finally {
      await fs.remove(tarPath);
    }
  }

  async getLatestBuilds(): Promise<StatusResult> {
    return await this.client.getAsync('builds');
  }
}
