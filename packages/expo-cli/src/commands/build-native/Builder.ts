import os from 'os';
import path from 'path';

import { Platform, prepareJob } from '@expo/build-tools';
import { ApiV2, FormData, User } from '@expo/xdl';
import axios from 'axios';
import concat from 'concat-stream';
import fs from 'fs-extra';
import md5File from 'md5-file/promise';
import ora from 'ora';
import { v4 as uuid } from 'uuid';

import { makeProjectTarball, waitForBuildEnd } from './utils';

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

interface PresignedPost {
  url: string;
  fields: object;
}

export default class Builder {
  client: ApiV2;

  constructor(user: User) {
    this.client = ApiV2.clientForUser(user);
  }

  async buildProject(projectDir: string, options: Options) {
    const tarPath = path.join(os.tmpdir(), `${uuid()}.tar.gz`);
    try {
      await makeProjectTarball(tarPath);

      const spinner = ora('Uploading project to server.').start();
      const checksum = await md5File(tarPath);
      const { presignedUrl } = await this.client.postAsync('upload-sessions', {
        type: 'turtle-project-sources',
        checksum,
      });
      const publicUrl = await uploadWithPresignedURL(presignedUrl, tarPath);
      spinner.succeed('Project uploaded.');

      const job = await prepareJob(options.platform, publicUrl, projectDir);
      const { buildId } = await this.client.postAsync('builds', { job: job as any });

      return await waitForBuildEnd(this.client, buildId);
    } finally {
      await fs.remove(tarPath);
    }
  }

  async getLatestBuilds(): Promise<StatusResult> {
    return await this.client.getAsync('builds');
  }
}

async function uploadWithPresignedURL(presignedPost: PresignedPost, file: string): Promise<string> {
  const fileStream = fs.createReadStream(file);

  const form = new FormData();
  for (const [fieldKey, fieldValue] of Object.entries(presignedPost.fields)) {
    form.append(fieldKey, fieldValue);
  }
  form.append('file', fileStream);

  try {
    const buffer = await new Promise(resolve => {
      form.pipe(concat({ encoding: 'buffer' }, data => resolve(data)));
    });
    const result = await axios.post(presignedPost.url, buffer, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
    });
    return String(result.headers.location);
  } catch (err) {
    err.message = err.body ? `${err.message}\n${err.body}` : err.message;
    console.log(err.response);
    throw err;
  }
}
