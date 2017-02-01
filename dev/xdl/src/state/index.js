/**
 * @flow
 */

import { connect as reduxConnect } from 'react-redux';

import * as project from './reducers/project';
import { createXDLStore } from './store';

// Reducers
export const reducers = {
  project: project.reducer,
};

export const store = createXDLStore(reducers);

// Actions
export const actions = {
  project: project.actions,
};

export const connect = (mapStateToProps: any, mapDispatchToProps: any, mergeProps: any, options: any = {}) => {
  return reduxConnect(mapStateToProps, mapDispatchToProps, mergeProps, {
    storeKey: 'xdlStore',
    ...options,
  });
};
