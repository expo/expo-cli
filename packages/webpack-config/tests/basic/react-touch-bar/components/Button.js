// @flow

import React, { Component } from 'react';

import BaseItem from './BaseItem';

export default class TouchBarButton extends Component {
  props: {
    label?: string,
    backgroundColor?: string,
    icon?: string,
    iconPosition?: 'left' | 'right' | 'overlay',
    onClick?: () => any,
  };

  render() {
    return <BaseItem type="TouchBarButton" itemProps={this.props} />;
  }
}
