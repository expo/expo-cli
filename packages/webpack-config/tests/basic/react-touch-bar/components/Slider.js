// @flow

import React, { Component } from 'react';

import BaseItem from './BaseItem';

export default class TouchBarSlider extends Component {
  props: {
    label?: string,
    value?: number,
    minValue?: number,
    maxValue?: number,
    onChange?: (value: number) => any,
  };

  render() {
    return <BaseItem type="TouchBarSlider" itemProps={this.props} />;
  }
}
