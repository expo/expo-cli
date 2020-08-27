// @flow
// adapted from 'graphql-subscriptions' package

import { EventEmitter } from 'events';
import { $$asyncIterator } from 'iterall';

export default function eventEmitterToAsyncIterator<T>(
  eventEmitter: EventEmitter,
  eventsNames: string | string[]
): AsyncIterator<T> {
  const pullQueue: any[] = [];
  const pushQueue: any[] = [];
  const eventsArray = typeof eventsNames === 'string' ? [eventsNames] : eventsNames;
  let listening = true;

  const pushValue = event => {
    if (pullQueue.length !== 0) {
      // @ts-ignore
      pullQueue.shift()({ value: event, done: false });
    } else {
      pushQueue.push(event);
    }
  };

  const pullValue = () => {
    return new Promise(resolve => {
      if (pushQueue.length !== 0) {
        resolve({ value: pushQueue.shift(), done: false });
      } else {
        pullQueue.push(resolve);
      }
    });
  };

  const emptyQueue = () => {
    if (listening) {
      listening = false;
      removeEventListeners();
      pullQueue.forEach(resolve => resolve({ value: undefined, done: true }));
      pullQueue.length = 0;
      pushQueue.length = 0;
    }
  };

  const listeners: any[] = [];

  const addEventListeners = () => {
    for (const eventName of eventsArray) {
      const listener = [
        eventName,
        event =>
          pushValue({
            eventName,
            event,
          }),
      ];
      listeners.push(listener);
      // @ts-ignore
      eventEmitter.addListener(eventName, listener[1]);
    }
  };

  const removeEventListeners = () => {
    for (const [eventName, listener] of listeners) {
      eventEmitter.removeListener(eventName, listener);
    }
  };

  addEventListeners();

  return {
    next(): Promise<IteratorResult<T, any>> {
      // @ts-ignore
      return listening ? pullValue() : this.return();
    },
    return() {
      emptyQueue();

      return Promise.resolve({ value: undefined, done: true });
    },
    throw(error) {
      emptyQueue();

      return Promise.reject(error);
    },
    [$$asyncIterator]() {
      return this;
    },
  };
}
