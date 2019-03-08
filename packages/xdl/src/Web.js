import opn from 'opn';

import Logger from './Logger';
import * as UrlUtils from './UrlUtils';

export async function openProjectAsync(projectRoot, options) {
  try {
    let url = await UrlUtils.constructWebAppUrlAsync(projectRoot, options);
    opn(url, { wait: false });
    return { success: true, url };
  } catch (e) {
    Logger.global.error(`Couldn't start project on web: ${e.message}`);
    return { success: false, error: e };
  }
}
