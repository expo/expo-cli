/**
 * @flow
 */
import { Project } from 'xdl';

import BaseBuilder from './BaseBuilder';
import { PLATFORMS } from './constants';

const { WEB } = PLATFORMS;

export default class WebBuilder extends BaseBuilder {
  async run() {
    // Check the status of any current builds
    // await this.checkForBuildInProgress();

    await Project.bundleWebpackAsync(this.projectDir, { dev: false });
  }

  platform() {
    return WEB;
  }
}
