/**
 * @flow
 */

import ncp from 'ncp';

export function ncpAsync(source: string, dest: string, options: any = {}) {
  return new Promise((resolve, reject) => {
    ncp(source, dest, options, (err) => {
      if (err) {
        reject();
      } else {
        resolve();
      }
    });
  });
}
