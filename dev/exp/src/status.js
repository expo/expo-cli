// @flow

import 'instapromise';
import request from 'request';
import { UrlUtils } from 'xdl';

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
