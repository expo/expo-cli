/**
 * @flow
 */
import Raven from 'raven';
import Config from './Config';

const SENTRY_DSN =
  'https://8554f14d112d4ed4b0558154762760ef:bae5673d5e5243abac5563d70861b5d8@sentry.io/194120';

Raven.config(SENTRY_DSN).install();

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
