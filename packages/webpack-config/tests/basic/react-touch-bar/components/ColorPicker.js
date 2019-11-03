// @flow

import React, { Component } from 'react';

import BaseItem from './BaseItem';

export default class TouchBarColorPicker extends Component {
  props: {
    availableColors?: Array<string>,
    selectedColor?: string,
    onChange?: (activeColor: string) => any,
  };

  render() {
    return <BaseItem type="TouchBarColorPicker" itemProps={this.props} />;
  }
}
