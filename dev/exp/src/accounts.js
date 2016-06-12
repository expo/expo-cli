import inquirerAsync from 'inquirer-async';

import {
  User,
} from 'xdl';

import log from './log';

async function signupOrLogin(options) {
  let username = options.username;
  let password = options.password;

  let questions = [];
  if (!username) {
    questions.push({
      type: 'input',
      name: 'username',
      message: 'username',
      validate(val) {
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
      validate(val) {
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

  var user = await User.loginAsync(data);

  if (user) {
    log("Success.");
    return user;
  } else {
    throw new Error("Unexpected Error: No user returned from the API");
  }
}

export default {
  signupOrLogin,
};
