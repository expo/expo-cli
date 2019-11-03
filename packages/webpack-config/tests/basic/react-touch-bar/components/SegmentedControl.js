// @flow

import React, { Component } from 'react';
import type { Children } from 'react';

import type { TouchBar$Item, TouchBar$Context } from '../Provider';
import { TouchBarContext } from '../Provider';

import BaseGroup from './BaseGroup';
import BaseItem from './BaseItem';

export default class TouchBarSegmentedControl extends Component {
  static contextTypes = TouchBarContext;
  props: {
    segmentStyle?:
      | 'automatic'
      | 'rounded'
      | 'textured-rounded'
      | 'round-rect'
      | 'textured-square'
      | 'capsule'
      | 'small-square'
      | 'separated',
    mode?: 'single' | 'multiple' | 'buttons',
    selectedIndex?: number,
    onChange?: (selectedIndex: number, isSelected: boolean) => any,
    children: Children,
  };

  id: string;

  constructor(props: any, context: TouchBar$Context) {
    super(props, context);

    this.id = context.touchBarProvider.generateId();
  }

  render() {
    return (
      <BaseGroup type="TouchBarSegmentedControl" id={this.id} itemProps={this.props}>
        <BaseItem eventsOnly id={this.id} itemProps={this.props} />
        {this.props.children}
      </BaseGroup>
    );
  }
}
