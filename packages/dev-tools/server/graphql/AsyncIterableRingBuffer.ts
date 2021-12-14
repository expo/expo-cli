import { $$asyncIterator } from 'iterall';

export default class AsyncIterableRingBuffer {
  buffer: any[] = [];
  _startItem: number = 0;
  _endItem: number = 0;
  _pushResolves: Function[] = [];

  constructor(public size: number) {}

  all(): number[] {
    return [...this.buffer];
  }

  allWithCursor(): { item: any; cursor: number }[] {
    return this.buffer.map((item, i) => ({
      item,
      cursor: this._startItem + i,
    }));
  }

  getNextCursor(cursor?: number): number {
    if (cursor != null && cursor >= this._startItem) {
      return cursor + 1;
    }
    return this._startItem;
  }

  getLastCursor(): number {
    return this._endItem;
  }

  async get(cursor: number) {
    if (this._endItem > cursor) {
      const adjustedCursor = cursor - this._startItem;
      return this.buffer[adjustedCursor];
    } else {
      return new Promise(resolve => {
        this._pushResolves.push(resolve);
      });
    }
  }

  length(): number {
    return this.buffer.length;
  }

  push(item: any): void {
    this.buffer.push(item);
    this._endItem++;
    this._pushResolves.forEach(resolve => resolve(item));
    this._pushResolves = [];

    if (this.buffer.length > this.size) {
      this.buffer.shift();
      this._startItem++;
    }
  }

  filterWithCursor(filter: (item: any, cursor: number) => number): {
    cursor?: number;
    items: any[];
  } {
    let cursor: number | undefined;
    const items = this.buffer.filter((item, i) => {
      cursor = this._startItem + i;
      return filter(item, cursor);
    });
    return {
      cursor,
      items,
    };
  }

  getIterator(cursor?: number): Record<string, any> {
    const buffer = this;
    let iterableCursor = cursor;
    return {
      async next() {
        iterableCursor = buffer.getNextCursor(iterableCursor);
        const value = await buffer.get(iterableCursor);
        return {
          value: {
            ...value,
            cursor: iterableCursor,
          },
          done: false,
        };
      },

      [$$asyncIterator]() {
        return this;
      },
    };
  }
}
