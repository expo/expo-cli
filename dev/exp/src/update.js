import 'instapromise';

import child_process from 'child_process';
import JsonFile from '@exponent/json-file';
import path from 'path';
import semver from 'semver';

import { UserSettings } from 'xdl';

function updatesObject() {
  let updatesJsonPath = path.join(UserSettings.dotExponentHomeDirectory(), 'updates.json');
  return new JsonFile(updatesJsonPath, {cantReadFileDefault: {}});
}

async function needToUpdate() {
  let updateAfter = new Date(await updatesObject().getAsync('lastUpdatedExp', new Date(1998, 11, 17)));
  updateAfter.setDate(updateAfter.getDate() + 1); // once a day check
  return updateAfter <= new Date();
}

async function fetchAndWriteLatestExpVersionAsync() {
  var packageName = await new JsonFile(path.join(__dirname, '..', 'package.json')).getAsync('name');
  var version_ = await child_process.promise.exec(`npm view ${packageName} version`);
  let trimmed = version_.trim();

  await updatesObject().mergeAsync({
    lastUpdatedExp: new Date(),
    latestVersionExp: trimmed,
  });

  return trimmed;
}

async function currentExpVersionAsync() {
  return new JsonFile(path.join(__dirname, '..', 'package.json')).getAsync('version');
}

async function checkForExpUpdateAsync() {
  var current = await currentExpVersionAsync();

  // check for an outdated install based on either a fresh npm query or our cache
  let latest;
  if (await needToUpdate()) {
    latest = await fetchAndWriteLatestExpVersionAsync();
  } else {
    latest = await updatesObject().getAsync('latestVersionExp', current);
  }

  var state;
  switch (semver.compare(current, latest)) {
    case -1:
      state = 'out-of-date';
      break;

    case 0:
      state = 'up-to-date';
      break;

    case 1:
      state = 'ahead-of-published';
      break;

    default:
      throw new Error("Confused about whether exp is up-to-date or not");
  }

  return {
    state,
    current,
    latest,
  };

}

export default {
  currentExpVersionAsync,
  checkForExpUpdateAsync,
};
