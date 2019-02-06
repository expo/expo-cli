import opn from 'opn';

import * as UrlUtils from './UrlUtils';

export async function openProjectAsync(projectRoot) {
  let url = await UrlUtils.constructWebAppUrlAsync(projectRoot);
  opn(url, { wait: false });
  try {
    await startAdbReverseAsync(projectRoot);

    let projectUrl = await UrlUtils.constructManifestUrlAsync(projectRoot);
    let { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);

    await openUrlAsync(projectUrl, !!exp.isDetached);
    return { success: true, url: projectUrl };
  } catch (e) {
    Logger.global.error(`Couldn't start project on web: ${e.message}`);
    return { success: false, error: e };
  }
}
