// @flow

import { Component } from 'react';

import type { TouchBar$Context } from '../Provider';
import { TouchBarContext } from '../Provider';

export default class BaseItem extends Component {
  static contextTypes = TouchBarContext;

  props: {
    id?: string,
    type?: string,
    itemProps: Object,
    eventsOnly?: boolean,
    onMount?: (context: TouchBar$Context) => any,
  };

  id = null;

  constructor(props: any, context: TouchBar$Context) {
    super(props, context);

    this.id = props.id || context.touchBarProvider.generateId();
  }

  componentDidMount() {
    this.context.touchBarProvider.emitter.on(this.id, this.handleEvent);

    if (this.props.onMount) {
      return this.props.onMount(this.context);
    }

    if (!this.props.eventsOnly) {
      this.context.touchBarProvider.addItem({
        id: this.id,
        type: this.props.type,
        props: this.props.itemProps,
      });
    }
  }

  shouldComponentUpdate(nextProps: any) {
    return false;
  }

  componentWillUnmount() {
    this.context.touchBarProvider.emitter.removeListener(this.id, this.handleEvent);
  }

  componentWillReceiveProps(nextProps: any) {
    const updatePayload = this.getUpdatePayload(nextProps);

    if (Object.keys(updatePayload).length) {
      this.context.touchBarProvider.updateItem({
        id: this.id,
        props: updatePayload,
      });
    }
  }

  getUpdatePayload(nextProps: any) {
    const ignored = ['onClick', 'onChange', 'children'];

    const filteredProps = Object.keys(nextProps.itemProps).filter(
      (key: string): boolean => !ignored.includes(key)
    );

    return filteredProps.reduce((payload: Object, prop: string): Object => {
      if (this.props.itemProps[prop] !== nextProps.itemProps[prop]) {
        payload[prop] = nextProps.itemProps[prop];
      }

      return payload;
    }, {});
  }

  handleEvent = ({ event, args }: Object) => {
    if (this.props.itemProps[event] instanceof Function) {
      this.props.itemProps[event](...args);
    }
  };

  render() {
    return null;
  }
}
