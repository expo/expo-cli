import {
  Doctor,
  ProjectUtils,
} from 'xdl';

import bunyan from 'bunyan';

import log from '../log';

async function action(projectDir) {
  ProjectUtils.attachLoggerStream(projectDir, {
    stream: {
      write: (chunk) => {
        if (chunk.level <= bunyan.INFO) {
          log(chunk.msg);
        } else if (chunk.level === bunyan.WARN) {
          log.warn(chunk.msg);
        } else {
          log.error(chunk.msg);
        }
      },
    },
    type: 'raw',
  });

  if (await Doctor.validateAsync(projectDir) === Doctor.NO_ISSUES) {
    log(`Didn't find any issues with your project!`);
  }
}

export default (program) => {
  program
    .command('doctor [project-dir]')
    .description('Diagnoses issues with your Exponent project.')
    .asyncActionProjectDir(action);
};
