/**
 * @flow
 */

import { connect as reduxConnect } from 'react-redux';

import * as notifications from './reducers/notifications';
import * as projects from './reducers/projects';
import { createXDLStore } from './store';

// Reducers
export const reducers = {
  notifications: notifications.reducer,
  projects: projects.reducer,
};

export const store = createXDLStore(reducers);

// Actions
export const actions = {
  notifications: notifications.actions,
  projects: projects.actions,
};

export const connect = (
  mapStateToProps: any,
  mapDispatchToProps: any,
  mergeProps: any,
  options: any = {}
) => {
  return reduxConnect(mapStateToProps, mapDispatchToProps, mergeProps, {
    storeKey: 'xdlStore',
    ...options,
  });
};
