/**
 * @flow
 */

import { connect as reduxConnect } from 'react-redux';

import * as notifications from './reducers/notifications';
import { createXDLStore } from './store';

// Reducers
export const reducers = {
  notifications: notifications.reducer,
};

export const store = createXDLStore(reducers);

// Actions
export const actions = {
  notifications: notifications.actions,
};

export const connect = (mapStateToProps: any, mapDispatchToProps: any, mergeProps: any, options: any = {}) => {
  return reduxConnect(mapStateToProps, mapDispatchToProps, mergeProps, {
    storeKey: 'xdlStore',
    ...options,
  });
};
