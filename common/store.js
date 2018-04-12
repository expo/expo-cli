import { createStore } from 'redux';

import * as Sets from 'app/common/sets';

const INITIAL_STATE = {
  devices: [],
  selectedId: null,
  count: 1,
  url: 'exp://192.168.0.1',
  isActiveDeviceAndroid: false,
  isActiveDeviceIOS: false,
};

export const reducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, ...action.state };
    case 'PUSH_LOG_TO_DEVICE':
      if (!state.devices[action.log.deviceIndex]) {
        return { ...state };
      }

      state.devices[action.log.deviceIndex].logs.push(action.log);

      return { ...state, ...{ devices: [...state.devices] } };
    case 'CONNECT_DEVICE':
      if (state.devices.find(d => d.id === action.device.id)) {
        return { ...state };
      }

      return { ...state, ...{ devices: [...state.devices, action.device] } };
    default:
      return state;
  }
};

export const initStore = (initialState = INITIAL_STATE) => {
  return createStore(reducer, initialState);
};
