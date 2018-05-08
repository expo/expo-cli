/* @flow */

import { $$asyncIterator } from 'iterall';

export default class AsyncIterableRingBuffer {
  constructor(size: number) {
    this.size = size;
    this.buffer = [];
    this._startItem = 0;
    this._endItem = 0;
    this._pushResolves = [];
  }

  all() {
    return [...this.buffer];
  }

  allWithCursor() {
    return this.buffer.map((item, i) => ({
      item,
      cursor: this._startItem + i,
    }));
  }

  getNextCursor(cursor: ?number) {
    if (cursor !== null && cursor >= this._startItem) {
      return cursor + 1;
    } else {
      return this._startItem;
    }
  }

  getLastCursor() {
    return this._endItem;
  }

  async get(cursor) {
    if (this._endItem > cursor) {
      const adjustedCursor = cursor - this._startItem;
      return this.buffer[adjustedCursor];
    } else {
      return new Promise(resolve => {
        this._pushResolves.push(resolve);
      });
    }
  }

  length() {
    return this.buffer.length;
  }

  push(item) {
    this.buffer.push(item);
    this._endItem++;
    this._pushResolves.forEach(resolve => resolve(item));
    this._pushResolves = [];

    if (this.buffer.length > this.size) {
      this.buffer.shift();
      this._startItem++;
    }
  }

  filterWithCursor(filter) {
    let cursor;
    const items = this.buffer.filter((item, i) => {
      cursor = this._startItem + i;
      return filter(item, cursor);
    });
    return {
      cursor,
      items,
    };
  }

  getIterator(cursor: ?number) {
    let buffer = this;
    let iterableCursor = cursor;
    return {
      async next() {
        iterableCursor = buffer.getNextCursor(iterableCursor);
        const value = await buffer.get(iterableCursor);
        return {
          value,
          done: false,
        };
      },

      [$$asyncIterator]() {
        return this;
      },
    };
  }
}
