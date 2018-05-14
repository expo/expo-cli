import { createStore } from 'redux';

const INITIAL_STATE = {
  isPublishing: false,
  recipient: '',
  toasts: [],
  isActiveDeviceAndroid: false,
  isActiveDeviceIOS: false,
};

const stateUpdate = (state, action) => {
  return { ...state, ...action.state };
};

const stateUpdateDeviceWithLog = (state, action) => {
  const deviceLogExists = state.devices.find(d => {
    return d.id === action.log.deviceId;
  });

  if (!deviceLogExists) {
    return { ...state };
  }

  let devices = state.devices.map(device => {
    if (device.id === action.log.deviceId) {
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

const stateAddToast = (state, action) => {
  const toasts = [...state.toasts].filter(t => t.id !== action.toast.id);

  toasts.unshift(action.toast);

  return { ...state, toasts };
};

const stateRemoveToast = (state, action) => {
  const remainingToasts = state.toasts.filter(t => t.id !== action.id);

  return { ...state, toasts: [...remainingToasts] };
};

export const reducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case 'UPDATE':
      return stateUpdate(state, action);
    case 'PUSH_LOG_TO_DEVICE':
      return stateUpdateDeviceWithLog(state, action);
    case 'CONNECT_DEVICE':
      return stateConnectDevice(state, action);
    case 'ADD_TOAST':
      return stateAddToast(state, action);
    case 'REMOVE_TOAST':
      return stateRemoveToast(state, action);
    default:
      return state;
  }
};

export const initStore = (initialState = INITIAL_STATE) => {
  return createStore(reducer, initialState);
};
