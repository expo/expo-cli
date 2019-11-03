// @flow

import React, { Component } from 'react';

import type { TouchBar$Context } from '../Provider';
import { TouchBarContext } from '../Provider';

export default class ScrubberItem extends Component {
  static contextTypes = TouchBarContext;

  props: {
    label?: string,
    icon?: string,
  };

  id: string;

  constructor(props: any, context: TouchBar$Context) {
    super(props, context);

    this.id = context.touchBarProvider.generateId();
  }

  componentDidMount() {
    this.context.touchBarProvider.addItem({
      id: this.id,
      ...this.props,
    });
  }

  render() {
    return null;
  }
}
