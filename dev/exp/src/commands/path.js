import log from '../log';

async function action(options) {
  // NOOP
  // exp.js already calls Binaries.writePathToUserSettingsAsync()
  log(`Set XDE path to ${process.env.PATH}`);
}

export default program => {
  program
    .command('path')
    .description('Sets PATH for XDE')
    .asyncAction(action);
};
