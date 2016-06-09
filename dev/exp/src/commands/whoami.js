import {
  User,
} from 'xdl';

var log = require('../log');

async function action(options) {
  let user = await User.whoamiAsync();
  if (user && user.username) {
    log(`Logged in as ${user.username}`);
    log.raw(user.username);
    return user;
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
