/**
 * @flow
 */

import _ from 'lodash';

export const actions = {
  // logLevel = 'warning', 'error', or 'info'
  add: (id: string, message: string, tag: string, logLevel: string) => {
    return {
      type: 'ADD_NOTIFICATION',
      id,
      message,
      tag,
      logLevel,
    };
  },

  clear: (id: string) => {
    return {
      type: 'CLEAR_NOTIFICATION',
      id,
    };
  },
};

const INITIAL_STATE = {
  count: 0,
  color: '#595C68',
  info: [],
  warn: [],
  error: [],
};

export const reducer = (state: any = INITIAL_STATE, action: any) => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return _addNotification(state, action);
    case 'CLEAR_NOTIFICATION':
      return _clearNotification(state, action);
    default:
      return state;
  }
};

function _addNotification(state: any, action: any) {
  let { id, message, tag, logLevel } = action;

  let array = state[logLevel];
  let index = _.findIndex(array, { id });
  if (index === -1) {
    array.push({
      id,
      message,
      tag,
      count: 0,
    });
  } else {
    array[index] = {
      id,
      message,
      tag,
      count: array[index].count + 1,
    };
  }

  let newState = state;
  newState[logLevel] = array;
  _setCount(newState);
  return newState;
}

function _clearNotification(state: any, action: any) {
  let newState = {};
  _.forEach(state, function(array, key) {
    _.remove(array, (notification) => {
      return notification.id === action.id;
    });

    newState[key] = array;
  });

  _setCount(newState);
  return newState;
}

function _setCount(state: any) {
  state.count = state.warn.length + state.error.length;
  if (state.count === 0) {
    state.color = '#595C68';
  } else {
    state.color = state.error.length > 0 ? '#F6345D' : '#FF8C00';
  }

  return state;
}
