/**
 * @flow
 */

import { createStore, applyMiddleware, combineReducers, compose } from 'redux';
import createLogger from 'redux-logger';

let _store;

export function createXDLStore(reducers: any) {
  const reducer = combineReducers(reducers);

  const middleware = [];

  // Only enable logging in development
  if (process.env.NODE_ENV === 'development') {
    const logger = createLogger({
      collapsed: true,
    });
    middleware.push(logger);
  }

  const enhancer = compose(applyMiddleware(...middleware));

  const store = createStore(reducer, enhancer);

  // Enable Webpack hot module replacement for reducers :)
  if (module.hot) {
    // $FlowFixMe
    module.hot.accept('./', () => {
      const nextReducers = require('./').reducers;
      store.replaceReducer(combineReducers(nextReducers));
    });
  }

  _store = store;
  return store;
}

export function getStore() {
  return _store;
}
