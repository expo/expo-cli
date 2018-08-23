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

    [$$asyncIterator]() {
      return this;
    },
  };
}
