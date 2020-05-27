import { Provider, connect } from 'react-redux';

import * as React from 'react';

const __REDUX_STORE__ = '__REDUX_STORE__';
const isCallOnServer = () => Object.prototype.toString.call(global.process) === '[object process]';

// NOTE(jim):
// We can get the initial state from any source.
const getOrCreateStore = (initStore, initialState) => {
  if (isCallOnServer() || typeof window === 'undefined') {
    return initStore(initialState);
  }

  if (!window[__REDUX_STORE__]) {
    window[__REDUX_STORE__] = initStore(initialState);
  }

  return window[__REDUX_STORE__];
};

export default (initStore, ...connectArgs) => Component => {
  const ConnectedComponent = connect(...connectArgs)(Component);

  const ComponentWithRedux = (props = {}) => {
    const { store, initialProps, initialState, ...otherProps } = props;

    return React.createElement(
      Provider,
      { store: store && store.dispatch ? store : getOrCreateStore(initStore, initialState) },
      React.createElement(ConnectedComponent, { ...initialProps, ...otherProps })
    );
  };

  ComponentWithRedux.getInitialProps = async (props = {}) => {
    const isServer = isCallOnServer();
    const store = getOrCreateStore(initStore);

    const initialProps = Component.getInitialProps
      ? await Component.getInitialProps({ ...props, isServer, store })
      : {};

    return {
      store,
      initialState: store.getState(),
      initialProps,
    };
  };

  return ComponentWithRedux;
};
