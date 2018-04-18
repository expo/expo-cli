import { createStore } from 'redux';

import * as Sets from 'app/common/sets';

const INITIAL_STATE = {
  devices: [],
  selectedId: null,
  count: 1,
  url: 'exp://192.168.0.1',
  userAddress: '',
  isActiveDeviceAndroid: false,
  isActiveDeviceIOS: false,
};

const stateUpdate = (state, action) => {
  return { ...state, ...action.state };
};

const stateUpdateDeviceWithLog = (state, action) => {
  if (!state.devices[action.log.deviceIndex]) {
    return { ...state };
  }
  let devices = state.devices.map((device, i) => {
    if (i === action.log.deviceIndex) {
      return {
        ...device,
        logs: [...device.logs, action.log],
      };
    } else {
      return device;
    }
  });
  return { ...state, devices };
};

const stateConnectDevice = (state, action) => {
  if (state.devices.find(d => d.id === action.device.id)) {
    return { ...state };
  }

  return { ...state, ...{ devices: [...state.devices, action.device] } };
};

export const reducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case 'UPDATE':
      return stateUpdate(state, action);
    case 'PUSH_LOG_TO_DEVICE':
      return stateUpdateDeviceWithLog(state, action);
    case 'CONNECT_DEVICE':
      return stateConnectDevice(state, action);
    default:
      return state;
  }
};

export const initStore = (initialState = INITIAL_STATE) => {
  return createStore(reducer, initialState);
};
