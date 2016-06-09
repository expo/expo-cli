import {
  User,
} from 'xdl';

var log = require('../log');

async function action(options) {
  let result = await User.logoutAsync();
  if (result) {
    log("Success.");
    return result;
  } else {
    throw new Error("Unexpected Error: Couldn't logout");
  }
}

module.exports = (program) => {
  program
    .command('logout')
    .description('Logout from exp.host')
    .asyncAction(action);
};
