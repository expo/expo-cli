// @flow

import React, { Component } from 'react';

import type { TouchBar$Item, TouchBar$Context } from '../Provider';

import BaseGroup from './BaseGroup';

export default class TouchBar extends Component {
  static defaultProps = {
    clearOnUnmount: true,
  };

  props: {
    clearOnUnmount?: boolean,
    children?: any,
  };

  onMount(context: TouchBar$Context, items: Array<TouchBar$Item>) {
    context.touchBarProvider.setItems(items);
  }

  onUnmount = (context: TouchBar$Context) => {
    if (this.props.clearOnUnmount) {
      context.touchBarProvider.setItems([]);
    }
  };

  render() {
    return (
      <BaseGroup onMount={this.onMount} onUnmount={this.onUnmount}>
        {this.props.children}
      </BaseGroup>
    );
  }
}
