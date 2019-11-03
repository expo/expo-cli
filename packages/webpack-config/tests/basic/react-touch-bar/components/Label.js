// @flow

import React, { Component } from 'react';

import BaseItem from './BaseItem';

export default class TouchBarLabel extends Component {
  props: {
    label?: string,
    textColor?: string,
  };

  render() {
    return <BaseItem type="TouchBarLabel" itemProps={this.props} />;
  }
}
