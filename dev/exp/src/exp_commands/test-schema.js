import { Doctor } from 'xdl';

import log from '../log';

async function action(projectDir, options) {
  try {
    if (options.schema) {
      let { schemaErrorMessage, assetsErrorMessage } = await Doctor.validateWithSchemaFileAsync(
        projectDir,
        options.schema
      );
      if (schemaErrorMessage) {
        log(schemaErrorMessage);
      } else if (assetsErrorMessage) {
        log(assetsErrorMessage);
      } else {
        log(`Schema and app.json are valid`);
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
