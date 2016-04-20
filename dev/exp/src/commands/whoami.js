import {
  Login,
} from 'xdl';

var log = require('../log');

async function action(options) {
  let result = await Login.whoamiAsync();
  if (result && result.user && result.user.username) {
    log(`Logged in as ${result.user.username}`);
    log.raw(result.user.username);
    return result;
  } else {
    throw new Error("Unexpected Error: Couldn't get user information");
  }
}

module.exports = (program) => {
  program
    .command('whoami')
    .alias('w')
    .description('Checks with the server and then says who you are logged in as')
    .asyncAction(action);
};
