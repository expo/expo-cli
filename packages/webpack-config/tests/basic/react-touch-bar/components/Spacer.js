// @flow

import React, { Component } from 'react';

import BaseItem from './BaseItem';

export default class TouchBarSpacer extends Component {
  props: {
    size?: 'small' | 'large' | 'flexible',
  };

  render() {
    return <BaseItem type="TouchBarSpacer" itemProps={this.props} />;
  }
}
