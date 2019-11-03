// @flow

import { Component } from 'react';
import type { Children } from 'react';

import type { TouchBar$Item, TouchBar$Context } from '../Provider';
import { TouchBarContext } from '../Provider';

export default class BaseGroup extends Component {
  static contextTypes = TouchBarContext;
  static childContextTypes = TouchBarContext;

  props: {
    id?: string,
    type?: string,
    itemProps?: Object,
    onMount?: (context: TouchBar$Context, items: Array<TouchBar$Item>) => any,
    onUnmount?: (context: TouchBar$Context) => any,
    children?: Children,
  };

  items = [];
  id = null;

  getChildContext = () => ({
    touchBarProvider: {
      ...this.context.touchBarProvider,
      addItem: this.addItem,
      removeItem: this.removeItem,
    },
  });

  constructor(props: any, context: TouchBar$Context) {
    super(props, context);

    this.id = props.id || context.touchBarProvider.generateId();
  }

  componentDidMount() {
    if (this.props.onMount) {
      return this.props.onMount(this.context, this.items);
    }

    this.context.touchBarProvider.addItem({
      id: this.id,
      type: this.props.type,
      props: {
        ...this.props.itemProps,
        children: null,
        items: this.items,
      },
    });
  }

  componentWillUnmount() {
    if (this.props.onUnmount) {
      return this.props.onUnmount(this.context);
    }
  }

  addItem = (item: TouchBar$Item) => {
    this.items.push(item);
  };

  removeItem = (removed: TouchBar$Item) => {
    this.items = this.items.filter((item: TouchBar$Item): boolean => item.id !== removed.id);

    this.context.touchBarProvider.updateItem(this.id, { items: this.items });
  };

  render() {
    return this.props.children || null;
  }
}
