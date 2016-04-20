var inquirerAsync = require('inquirer-async');

import {
  Login,
} from 'xdl';

var log = require('./log');

async function signupOrLogin(options) {
  let username = options.username;
  let password = options.password

  let questions = [];
  if (!username) {
    questions.push({
      type: 'input',
      name: 'username',
      message: 'username',
      validate: function (val) {
        // TODO: Validate username here
        return true;
      },
    });
  }

  if (!password) {
    questions.push({
      type: 'password',
      name: 'password',
      message: 'password',
      validate: function (val) {
        // TODO: Validate
        return true;
      },
    });
  }

  var answers = await inquirerAsync.promptAsync(questions);

  var data = {
    username: username || answers.username,
    password: password || answers.password,
  };

  var result = await Login.loginOrAddUserAsync(data);
  var user = result.user;

  if (user) {
    log("Success.");
    return result;
  } else {
    throw new Error("Unexpected Error: No user returned from the API");
  }
}

module.exports = {
  signupOrLogin,
};
