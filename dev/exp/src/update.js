import 'instapromise';

import child_process from 'child_process';
import jsonFile from '@exponent/json-file';
import path from 'path';
import semver from 'semver';

async function latestExpVersionAsync() {
  var packageName = await jsonFile(path.join(__dirname, '..', 'package.json')).getAsync('name');
  var version_ = await child_process.promise.exec('npm view ' + packageName + ' version');
  return version_.trim();
}

async function currentExpVersionAsync() {
  return jsonFile(path.join(__dirname, '..', 'package.json')).getAsync('version');
}

async function checkForExpUpdateAsync() {
  var current$ = currentExpVersionAsync();
  var latest$ = latestExpVersionAsync();
  var [current, latest] = await Promise.all([current$, latest$]);

  var state;
  var message;
  switch (semver.compare(current, latest)) {
    case -1:
      state = 'out-of-date';
      message = "There is a new version of exp available (" + latest + ").\n" +
        "You are currently using exp " + current + "\n" +
        "Run `npm update -g exp` to get the latest version";
      break;

    case 0:
      state = 'up-to-date';
      message = "Your version of exp (" + current + ") is the latest version available.";
      break;

    case 1:
      state = 'ahead-of-published';
      message = "Your version of exp (" + current + ") is newer than the" +
        " latest version published to npm (" + latest + ").";
      break;

    default:
      throw new Error("Confused about whether exp is up-to-date or not");
  }

  return {
    state,
    message,
    current,
    latest,
  };

}

export default {
  currentExpVersionAsync,
  latestExpVersionAsync,
  checkForExpUpdateAsync,
};
