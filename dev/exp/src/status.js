// @flow

import 'instapromise';
import chalk from 'chalk';
import request from 'request';
import { Project, UrlUtils } from 'xdl';

export type ProjectStatus = 'running' | 'ill' | 'exited';

export async function currentProjectStatus(projectDir: string): Promise<ProjectStatus> {
  const manifestUrl = await UrlUtils.constructManifestUrlAsync(projectDir, { urlType: 'http'});
  const packagerUrl = await UrlUtils.constructBundleUrlAsync(projectDir, { urlType: 'http'});

  let packagerRunning = false;
  try {
    const res = await request.promise(`${packagerUrl}/debug`);

    if (res.statusCode < 400) {
      packagerRunning = true;
    }
  } catch (e) { }

  let manifestServerRunning = false;
  try {
    const res = await request.promise(manifestUrl);
    if (res.statusCode < 400) {
      manifestServerRunning = true;
    }
  } catch (e) { }

  if (packagerRunning && manifestServerRunning) {
    return 'running';
  } else if (packagerRunning || manifestServerRunning) {
    return 'ill';
  } else {
    return 'exited';
  }
}

export function installExitHooks(projectDir: string) {
  // install ctrl+c handler that writes non-running state to directory
  if (process.platform === 'win32') {
    require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    })
      .on("SIGINT", () => {
        process.emit("SIGINT");
      });
  }

  process.on('SIGINT', () => {
    console.log(chalk.blue('\nStopping packager...'));
    Project.stopAsync(projectDir).then(() => {
      console.log(chalk.green('Packager stopped.'));
      process.exit();
    });
  });
}
