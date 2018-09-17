import child_process from 'child_process';

import log from '../../log';

export async function spawnAndCollectJSONOutputAsync(program, args) {
  return new Promise((resolve, reject) => {
    try {
      const wrapped = [`${args.join(' ')}`];
      const options = { stdio: ['inherit', 'inherit', 'pipe'] };
      const child = child_process.spawnSync(program, wrapped, options);
      const rawJson = child.stderr.toString();
      resolve(JSON.parse(rawJson));
    } catch (error) {
      reject(error);
    }
  });
}

export function printFastlaneError(result) {
  if (result.rawDump.message) {
    log.error(result.rawDump.message);
  } else {
    log.error('Returned json: ');
    log.error(result.rawDump);
  }
}
