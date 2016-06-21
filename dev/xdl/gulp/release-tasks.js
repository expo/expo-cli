import 'instapromise';

import spawnAsync from '@exponent/spawn-async';
import fs from 'fs';
import logger from 'gulplog';
import path from 'path';

const TEMPLATE_DIR = '../../apps/new-project-template';

const paths = {
  template: path.resolve(__dirname, `../${TEMPLATE_DIR}`),
  templateNodeModules: path.resolve(__dirname, `../${TEMPLATE_DIR}/node_modules`),
  templateExponentDir: path.resolve(__dirname, `../${TEMPLATE_DIR}/.exponent`),
};

let tasks = {
  async archiveTemplate() {
    await verifyNodeModulesAsync();
    let options = {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    };
    await spawnAsync('rm', ['-rf', paths.templateExponentDir], options);
    await spawnAsync('rm', ['template.tar.gz'], options);
    await spawnAsync('tar', ['-zcvf', 'template.tar.gz', '-C', paths.template, '.'], options);
  },
};

async function verifyNodeModulesAsync() {
  let stats;
  try {
    stats = await fs.promise.stat(paths.templateNodeModules);
  } catch (e) { }

  if (stats) {
    if (!stats.isDirectory()) {
      throw new Error(
        `${paths.templateNodeModules} is not a directory; be sure to run ` +
        `"npm install" before releasing a new version of XDL`
      );
    }
  } else {
    logger.info(`Running "npm install" to set up ${paths.templateNodeModules}...`);
    await spawnAsync('npm', ['install'], {
      stdio: 'inherit',
      cwd: paths.template,
    });
  }
}

export default tasks;
