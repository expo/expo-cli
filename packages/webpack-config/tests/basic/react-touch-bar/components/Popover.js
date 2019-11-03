// @flow

import React, { Component } from 'react';
import type { Children } from 'react';

import BaseGroup from './BaseGroup';

export default class TouchBarPopover extends Component {
  props: {
    label?: string,
    icon?: string,
    showCloseButton?: boolean,
    children: Children,
  };

  props: {
    children?: any,
  };

  render() {
    return (
      <BaseGroup type="TouchBarPopover" itemProps={this.props}>
        {this.props.children}
      </BaseGroup>
    );
  }
}
