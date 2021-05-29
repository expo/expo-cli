import chalk from 'chalk';
import { boolish } from 'getenv';

const isProfiling = boolish('EXPO_PROFILE', false);

// eslint-disable-next-line no-console
const consoleTime: (label?: string) => void = isProfiling ? console.time : () => {};
// eslint-disable-next-line no-console
const consoleTimeEnd: (label?: string) => void = isProfiling ? console.timeEnd : () => {};

/**
 * Wrap a method and profile the time it takes to execute the method using `EXPO_PROFILE`.
 * Works best with named functions (i.e. not arrow functions).
 *
 * @param fn
 * @param functionName
 */
export const profileMethod = <T extends any[], U>(fn: (...args: T) => U, functionName?: string) => {
  const name = chalk.dim(`⏱  [profile] ${functionName ?? (fn.name || 'unknown')}`);
  return (...args: T): U => {
    consoleTime(name);
    const results = fn(...args);
    if (results instanceof Promise) {
      // @ts-ignore
      return new Promise<U>((resolve, reject) => {
        results
          .then(results => {
            resolve(results);
            consoleTimeEnd(name);
          })
          .catch(error => {
            reject(error);
            consoleTimeEnd(name);
          });
      });
    } else {
      consoleTimeEnd(name);
    }
    return results;
  };
};
