/**
 * @flow
 */

import _ from 'lodash';

const INITIAL_PROJECT_STATE = {
  count: 0,
  color: '#595C68',
  info: [],
  warn: [],
  error: [],
};

const GLOBAL = 'global';

export const actions = {
  // logLevel = 'warning', 'error', or 'info'
  add: (projectRoot: string, id: string, message: string, tag: string, logLevel: string) => {
    return {
      type: 'ADD_NOTIFICATION',
      projectRoot,
      id,
      message,
      tag,
      logLevel,
    };
  },

  clear: (projectRoot: string, id: string) => {
    return {
      type: 'CLEAR_NOTIFICATION',
      projectRoot,
      id,
    };
  },

  addGlobal: (id: string, message: string, tag: string, logLevel: string) => {
    return {
      type: 'ADD_NOTIFICATION',
      projectRoot: GLOBAL,
      id,
      message,
      tag,
      logLevel,
    };
  },

  clearGlobal: (id: string) => {
    return {
      type: 'CLEAR_NOTIFICATION',
      projectRoot: GLOBAL,
      id,
    };
  },
};

export const reducer = (state: any = {}, action: any) => {
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
  let { projectRoot, id, message, tag, logLevel } = action;

  if (logLevel !== 'info' && logLevel !== 'warn' && logLevel !== 'error') {
    logLevel = 'info';
  }

  let projectObject = state[projectRoot] || INITIAL_PROJECT_STATE;
  projectObject = JSON.parse(JSON.stringify(projectObject));
  let arrayOfIssues = projectObject[logLevel];
  let index = _.findIndex(arrayOfIssues, { id });
  if (index === -1) {
    arrayOfIssues.push({
      id,
      message,
      tag,
      count: 0,
    });
  } else {
    arrayOfIssues[index] = {
      id,
      message,
      tag,
      count: arrayOfIssues[index].count + 1,
    };
  }

  // TODO: switch to immutable.js
  let newState = JSON.parse(JSON.stringify(state));
  projectObject[logLevel] = arrayOfIssues;
  _setCount(projectObject);
  newState[projectRoot] = projectObject;
  return newState;
}

function _clearNotification(state: any, action: any) {
  let { projectRoot, id } = action;

  if (!state[projectRoot]) {
    return state;
  }

  let projectObject = state[projectRoot];
  let newProjectObject = {};
  _.forEach(projectObject, function(array, key) {
    if (Array.isArray(array)) {
      _.remove(array, notification => {
        if (notification.id === id) {
          console.log('REMOVED' + id);
        }
        return notification.id === id;
      });

      newProjectObject[key] = array;
    }
  });

  _setCount(newProjectObject);
  // TODO: switch to immutable.js
  let newState = JSON.parse(JSON.stringify(state));
  newState[projectRoot] = newProjectObject;
  return newState;
}

function _setCount(projectObject: any) {
  projectObject.count = projectObject.warn.length + projectObject.error.length;
  if (projectObject.count === 0) {
    projectObject.color = '#595C68';
  } else {
    projectObject.color = projectObject.error.length > 0 ? '#F6345D' : '#FF8C00';
  }

  return projectObject;
}
