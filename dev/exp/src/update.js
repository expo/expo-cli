/**
 * @flow
 */

import 'instapromise';

import child_process from 'child_process';
import JsonFile from '@exponent/json-file';
import path from 'path';
import semver from 'semver';

import { UserSettings } from 'xdl';

function updatesObject() {
  const updatesJsonPath = path.join(UserSettings.dotExponentHomeDirectory(), 'updates.json');
  return new JsonFile(updatesJsonPath, {cantReadFileDefault: {}});
}

async function needToUpdate() {
  const updateAfter = new Date(await updatesObject().getAsync('lastUpdatedExp', new Date(1998, 11, 17)));
  updateAfter.setDate(updateAfter.getDate() + 1); // once a day check
  return updateAfter <= new Date();
}

async function fetchAndWriteLatestExpVersionAsync() {
  const packageName = await new JsonFile(path.join(__dirname, '..', 'package.json')).getAsync('name');
  // $FlowFixMe
  const version_ = await child_process.promise.exec(`npm view ${packageName} version`);
  const trimmed = version_.trim();

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
  const current = await currentExpVersionAsync();

  // check for an outdated install based on either a fresh npm query or our cache
  let latest;
  if (await needToUpdate()) {
    latest = await fetchAndWriteLatestExpVersionAsync();
  } else {
    latest = await updatesObject().getAsync('latestVersionExp', current);
  }

  if (semver.compare(current, latest) === 1) {
    // if the current version is ahead of npm version, we should explicitly check again (bypassing cache)
    latest = await fetchAndWriteLatestExpVersionAsync();
  }

  let state;
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
