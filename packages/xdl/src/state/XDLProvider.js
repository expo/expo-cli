/**
 * @flow
 */

import PropTypes from 'prop-types';
import { Component, Children } from 'react';

import { getStore } from './store';

export default class XDLProvider extends Component {
  getChildContext() {
    return { xdlStore: this.store, xdlStoreSubscription: null };
  }

  constructor(props, context) {
    super(props, context);
    this.store = getStore();
  }

  render() {
    return Children.only(this.props.children);
  }
}

XDLProvider.childContextTypes = {
  xdlStore: PropTypes.object.isRequired,
  xdlStoreSubscription: PropTypes.object,
};
XDLProvider.displayName = 'XDLProvider';
