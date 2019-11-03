// @flow

import React, { Component } from 'react';
import type { Children } from 'react';

import BaseGroup from './BaseGroup';

export default class TouchBarGroup extends Component {
  props: {
    children: Children,
  };

  render() {
    return <BaseGroup type="TouchBarGroup">{this.props.children}</BaseGroup>;
  }
}
