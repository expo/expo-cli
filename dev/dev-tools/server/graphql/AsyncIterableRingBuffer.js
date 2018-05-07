/* @flow */

import { $$asyncIterator } from 'iterall';

export default class AsyncIterableRingBuffer {
  constructor(size: number) {
    this.size = size;
    this.buffer = [];
    this._startItem = 0;
    this._endItem = 0;
    this._pushResolves = [];
    this._updateQueue = [];
    this._updateResolves = [];
  }

  all() {
    return [...this.buffer];
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

  update(selector, updatedItem) {
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      const item = this.buffer[i];
      if (selector(item)) {
        this.buffer[i] = updatedItem;
        if (this._updateResolves.length) {
          this._updateResolves.forEach(resolve => resolve(updatedItem));
        } else {
          this._updateQueue.push(updatedItem);
        }
        return;
      }
    }
    this.push(updatedItem);
  }

  async getUpdate() {
    if (this._updateQueue.length) {
      return this._updateQueue.shift();
    } else {
      return new Promise(resolve => {
        this._updateResolves.push(resolve);
      });
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

  getPushIterator(cursor: ?number) {
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

  getUpdateIterator() {
    let buffer = this;
    return {
      async next() {
        return {
          value: await buffer.getUpdate(),
          done: false,
        };
      },

      [$$asyncIterator]() {
        return this;
      },
    };
  }
}
