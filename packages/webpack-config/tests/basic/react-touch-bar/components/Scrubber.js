// @flow

import React, { Component } from 'react';
import type { Children } from 'react';

import type { TouchBar$Item, TouchBar$Context } from '../Provider';
import { TouchBarContext } from '../Provider';
import BaseGroup from './BaseGroup';
import BaseItem from './BaseItem';

export default class TouchBarScrubber extends Component {
  static contextTypes = TouchBarContext;

  props: {
    selectedStyle?: 'background' | 'outline',
    overlayStyle?: 'background' | 'outline',
    showArrowButtons?: boolean,
    mode?: 'fixed' | 'free',
    onChange?: (item: any) => any,
    onClick?: (item: any) => any,
    children: Children,
  };

  id: string;

  constructor(props: any, context: TouchBar$Context) {
    super(props, context);

    this.id = context.touchBarProvider.generateId();
  }

  render() {
    return (
      <BaseGroup type="TouchBarScrubber" id={this.id} itemProps={this.props}>
        <BaseItem eventsOnly id={this.id} itemProps={this.props} />
        {this.props.children}
      </BaseGroup>
    );
  }
}
