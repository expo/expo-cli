import { Component } from 'react';
import { ipcRenderer } from 'electron';
import uuid from 'uuid';
import EventEmitter from 'events';
import PropTypes from 'prop-types';

import type { Children } from 'react';

export const TouchBarContext = {
  touchBarProvider: PropTypes.shape({
    setItems: PropTypes.func,
    addItem: PropTypes.func,
    removeItem: PropTypes.func,
    updateItem: PropTypes.func,
    generateId: PropTypes.func,
    emitter: PropTypes.object,
  }),
};

export type TouchBar$Item = {
  id: string,
  type: string,
  props: Object,
};

export type TouchBar$Context = {
  touchBarProvider: {
    setItems: (items: Array<TouchBar$Item>) => void,
    addItem: (item: TouchBar$Item) => void,
    removeItem: (item: TouchBar$Item) => void,
    updateItem: (item: TouchBar$Item) => void,
    generateId: () => string,
    emitter: EventEmitter,
  },
};

export default class TouchBarProvider extends Component {
  static childContextTypes = TouchBarContext;

  props: {
    children: Children,
  };

  emitter = new EventEmitter();

  getChildContext() {
    return {
      touchBarProvider: {
        addItem: () => {},
        setItems: this.setItems,
        removeItem: this.removeItem,
        updateItem: this.updateItem,
        generateId: this.generateId,
        emitter: this.emitter,
      },
    };
  }

  componentDidMount() {
    ipcRenderer.on('TouchBarEvent', this.handleEvent);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('TouchBarEvent', this.handleEvent);
  }

  generateId = (): string => {
    return uuid.v4();
  };

  setItems = (items: Array<TouchBar$Item>) => {
    ipcRenderer.send('setTouchBar', items);
  };

  removeItem = (item: TouchBar$Item) => {
    console.log('remove', item);
  };

  updateItem = (item: TouchBar$Item) => {
    ipcRenderer.send('updateTouchBar', item);
  };

  handleEvent = (event: Object, args: any) => {
    this.emitter.emit(args.id, args);
  };

  render() {
    return this.props.children;
  }
}
