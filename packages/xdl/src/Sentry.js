/**
 * @flow
 */
import Config from './Config';

let Raven;
let SENTRY_DSN;

if (global.XMLHttpRequest) {
  // use browser version and DSN for xde
  Raven = require('raven-js');
  SENTRY_DSN = 'https://8554f14d112d4ed4b0558154762760ef@sentry.io/194120';
} else {
  // use node version and DSN for crna and exp
  Raven = require('raven');
  SENTRY_DSN = `
    https://8554f14d112d4ed4b0558154762760ef:bae5673d5e5243abac5563d70861b5d8@sentry.io/194120
  `;
}

Raven.config(SENTRY_DSN).install();

type TagType = {
  [key: string]: string,
};

export function logError(message: string, options?: Object): void {
  // send error to Sentry
  // add `testing: true` to tags to avoid sending an email when testing
  Raven.captureMessage(message, getOptions(options));
}

export function captureException(ex: Error, options?: Object) {
  Raven.captureException(ex, getOptions(options));
}

function getOptions(options = {}) {
  return {
    ...options,
    tags: {
      ...options.tags,
      developerTool: Config.developerTool,
      offline: Config.offline,
    },
  };
}
