import { Doctor } from 'xdl';

import log from '../log';

async function action(projectDir, options) {
  try {
    if (options.schema) {
      let { errorMessage } = await Doctor.validateWithSchemaFileAsync(projectDir, options.schema);
      if (errorMessage) {
        log(errorMessage);
      } else {
        log(`Schema and exp.json are valid`);
      }
    } else {
      log(`No option provided`);
    }
  } catch (e) {
    log(e);
  }
  process.exit();
}

export default program => {
  program
    .command('test-schema [project-dir]', null, { noHelp: true })
    .option('-s, --schema [path]', 'Validate the current directory against the given schema')
    .allowNonInteractive()
    .asyncActionProjectDir(action, true /* skip project validation */);
};
