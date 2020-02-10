// @flow
import { $$asyncIterator } from 'iterall';

export default function mergeAsyncIterators(...iterators: Array<AsyncIterator>) {
  const promises = iterators.map(() => null);

  return {
    async next() {
      for (let i = 0; i < promises.length; i++) {
        if (!promises[i]) {
          promises[i] = iterators[i].next();
        }
      }
      const [i, result] = await Promise.race(promises.map(async (value, i) => [i, await value]));
      promises[i] = null;
      return {
        done: false,
        value: result.value,
      };
    },

    async return() {
      for (const iterator of iterators) {
        if (iterator.return) {
          await iterator.return();
        }
      }
      return {
        done: true,
        value: undefined,
      };
    },

    async throw(error) {
      for (const iterator of iterators) {
        if (iterator.throw) {
          await iterator.throw(error);
        }
      }
      return {
        done: true,
        value: undefined,
      };
    },

    [$$asyncIterator]() {
      return this;
    },
  };
}
