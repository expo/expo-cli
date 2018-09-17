import fs from 'fs';

import ProgressBar from 'progress';
import Axios from 'axios';
import _ from 'lodash';
import { BuildInformation, ProjectUtils } from 'xdl';
import * as UrlUtils from '../utils/url';
import prompt from '../../prompt';
import log from '../../log';

const OPTIONS = ['path', 'latest', 'id'];

export default class BaseUploader {
  constructor({ projectDir, options, platform, platformName, platformExtension }) {
    this.projectDir = projectDir;
    this.options = options;
    this.platform = platform;
    this.platformName = platformName;
    this.platformExtension = platformExtension;
    this.fastlane = require('@expo/traveling-fastlane-darwin')();
  }

  ensurePlatformOptionsAreCorrect() {}

  ensureConfigDataIsCorrect(configData) {
    throw new Error('Not implemented');
  }

  getPlatformData() {
    throw new Error('Not implemented');
  }

  uploadToStore(data, configData, platformData, path) {
    throw new Error('Not implemented');
  }

  pathGetter() {
    return {
      path: this.options.path,
      platform: this.platform,
    };
  }

  ensureFileIsCorrect(file) {
    const regexp = new RegExp(`^.*.${this.platformExtension}$`);
    if (!regexp.test(file)) {
      throw new Error(`File ${file} isn't ${this.platformExtension} file`);
    }
  }

  async idGetter() {
    const { id } = this.options;
    const platform = this.platform;
    const [build] = await BuildInformation.getBuildInformation({ id, platform }, this.projectDir);
    if (!build) {
      throw new Error(`There isn't any build with id: ${id}`);
    }
    return {
      id,
      platform: build.platform,
      remoteUrl: build.artifacts.url,
    };
  }

  async latestGetter() {
    const platform = this.platform;
    const [build] = await BuildInformation.getBuildInformation(
      { limit: 1, platform },
      this.projectDir
    );
    if (!build) {
      throw new Error(`There are no builds for ${platform}`);
    }
    return {
      id: build.id,
      platform,
      remoteUrl: build.artifacts.url,
    };
  }

  async chooseBuild() {
    const platform = this.platform;
    const builds = await BuildInformation.getBuildInformation(
      { platform, limit: 10 },
      this.projectDir
    );
    if (!builds.length) {
      log.warn(`There are no builds for ${this.platformName}`);
      process.exit(0);
    }
    const { build } = await prompt({
      name: 'build',
      message: 'Choose build to upload',
      type: 'list',
      choices: builds.map(build => {
        const platformPart = build.platform === 'ios' ? 'iOS' : 'Android';
        const message = `### ${platformPart} | ${UrlUtils.constructBuildLogsUrl(build.id)} ###`;

        return {
          name: message,
          value: build,
        };
      }),
    });

    return {
      id: build.id,
      platform: build.platform,
      remoteUrl: build.artifacts.url,
    };
  }

  async askUser() {
    const SOURCES_LIST = [
      {
        name: 'Latest build',
        value: 'latest',
      },
      {
        name: 'Other build',
        value: 'other',
      },
    ];
    const { source } = await prompt({
      name: 'source',
      message: 'Which build do you want to upload?',
      type: 'list',
      choices: SOURCES_LIST,
    });

    if (source === 'latest') {
      return this.latestGetter();
    } else {
      return this.chooseBuild();
    }
  }

  async getData() {
    const options = this.options;
    if (options.path) {
      return this.pathGetter();
    } else if (options.latest) {
      return this.latestGetter();
    } else if (options.id) {
      return this.idGetter();
    } else {
      return this.askUser();
    }
  }

  async getConfigData() {
    const { exp } = await ProjectUtils.readConfigJsonAsync(this.projectDir);
    const configName = await ProjectUtils.configFilenameAsync(this.projectDir);
    if (!exp) {
      throw new Error(`Couldn't read ${configName} file in project at ${this.projectDir}.`);
    }
    this.ensureConfigDataIsCorrect(exp);
    return exp;
  }

  async downloadFile(src, dest) {
    const response = await Axios({
      method: 'GET',
      url: src,
      responseType: 'stream',
    });
    const totalLength = parseInt(response.headers['content-length'], 10);
    const bar = new ProgressBar('Downloading [:bar] :percent :etas', {
      complete: '=',
      incomplete: ' ',
      total: totalLength,
    });
    response.data.pipe(fs.createWriteStream(dest));
    return new Promise((resolve, reject) => {
      response.data.on('end', () => resolve(dest));
      response.data.on('data', data => bar.tick(data.length));
      response.data.on('error', error => reject(new Error(`${error}`)));
    });
  }

  async checkAndDownloadFile(remoteUrl) {
    const dest = _.last(remoteUrl.split('/'));
    if (fs.existsSync(dest)) {
      log.warn(
        `File ${dest} exists. If it's not ${this
          .platformExtension} you want to upload, please change its name.`
      );
      return dest;
    }
    log(`Downloading build from ${remoteUrl}`);
    return this.downloadFile(remoteUrl, dest);
  }

  async upload() {
    this.ensureOptionsAreCorrect();
    const data = await this.getData();
    const configData = await this.getConfigData();
    const path = data.path ? data.path : await this.checkAndDownloadFile(data.remoteUrl);
    const platformData = await this.getPlatformData();
    await this.uploadToStore(configData, platformData, path);
    fs.unlinkSync(path);
  }

  ensureOptionsAreCorrect() {
    const options = this.options;
    const definedKeys = Object.keys(_.pick(options, OPTIONS)).filter(key => !_.isNil(options[key]));
    if (definedKeys.length > 1) {
      throw new Error(`You have to choose only one of --path, --id, --latest`);
    }
    if (options.path && !fs.existsSync(options.path)) {
      throw new Error(`File ${options.path} doesn't exist`);
    }
    if (options.path) {
      this.ensureFileIsCorrect(options.path);
    }
    this.ensurePlatformOptionsAreCorrect();
  }

  getFastlane() {}
}
