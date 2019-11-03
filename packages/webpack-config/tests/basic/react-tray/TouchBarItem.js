import * as React from 'react';
import PropTypes from 'prop-types';

import { remote } from 'electron';
import uuid from 'uuid';

export const TYPES = {
  button: 'Button',
  colorPicker: 'ColorPicker',
  group: 'Group',
  label: 'Label',
  popover: 'Popover',
  scrubber: 'Scrubber',
  segmentedControl: 'SegmentedControl',
  slider: 'Slider',
  spacer: 'Spacer',
};

const isSegment = item => item.type === 'segmentedControl';
const isScrubber = item => item.type === 'scrubber';

function getSegments(segments) {
  return segments.map(segment =>
    Object.assign({}, segment, {
      icon: getIcon(segment.icon),
    })
  );
}

const { TouchBar } = remote;
const path = require('path');

function getIcon(icon) {
  return icon ? path.join(process.cwd(), icon) : null;
}

function buildFromTemplate(item, onEvent) {
  if (Array.isArray(item)) {
    return item.map(data => buildFromTemplate(data, onEvent));
  }
  let props = {
    icon: getIcon(item.icon),
  };
  // item.__id = uuid.v4();

  if (isSegment(item)) {
    // props.segments = getSegments(item.items);
  }

  if (isScrubber(item)) {
    // props.items = getSegments(item.items);
  }

  if (item.items && !isSegment(item) && !isScrubber(item)) {
    // Group
    console.log('children: ', item.children);
    // props.items = item.children.map(data => buildFromTemplate(data, onEvent))
  }

  const type = `TouchBar${TYPES[item.type]}`;
  console.log('Create: ', type);
  const nativeItem = new TouchBar[type](
    Object.assign({}, item, props, {
      click(...props) {
        onEvent(nativeItem, 'onClick', ...props);
      },
      change(...props) {
        onEvent(nativeItem, 'onChange', ...props);
      },
    })
  );
  return nativeItem;
}

const EVENTS = { onClick: 'click', onChange: 'change' };
function createBarItem({ type }) {
  return class extends React.Component {
    static defaultProps = {
      type,
    };

    static propTypes = {
      label: PropTypes.string,
      role: PropTypes.string,
      type: PropTypes.string,
      accelerator: PropTypes.string,
      icon: PropTypes.string,
      checked: PropTypes.bool,
      enabled: PropTypes.bool,
      onClick: PropTypes.func,
      children: PropTypes.node,
    };

    static TYPES = TYPES;

    item = null;

    constructor(props) {
      super(props);

      // Create
      this.item = buildFromTemplate(props, this._onEvent);
      // this._bindEvents();
    }

    _onEvent = (nativeItem, eventName, ...props) => {
      if (this.props[eventName] instanceof Function) {
        this.props[eventName](...props);
      }
    };

    _bindEvents = () => {
      for (const event of Object.keys(EVENTS)) {
        const nativeEventName = EVENTS[event];
        console.log('bind event: ', nativeEventName);
        this.item[nativeEventName] = (...props) => {
          console.log('parse event: ', event, props);
          if (this.props[event] instanceof Function) {
            this.props[event](...props);
          }
        };
      }
    };

    componentWillReceiveProps(props) {
      if (props.type !== this.props.type) {
        // Recreate
        this.item = buildFromTemplate(props, this._onEvent);
        // this._bindEvents();
      } else {
        // Update

        const _isSegment = isSegment(props);
        const _isScrubber = isScrubber(props);

        if (props.icon !== this.props.icon) {
          this.item.icon = getIcon(props.icon);
        }
        const CC = [
          'label',
          'textColor',
          'enabled',
          'value',
          'minValue',
          'maxValue',
          'size',
          'segmentStyle',
          'mode',
          'selectedIndex',
          'selectedStyle',
          'overlayStyle',
          'showArrowButtons',
          'showCloseButton',
          'availableColors',
          'selectedColor',
          'backgroundColor',
          'iconPosition',
        ];
        for (const prop of CC) {
          if (props[prop] !== this.props[prop]) {
            this.item[prop] = props[prop];
          }
        }
        if (props.items !== this.props.items) {
          switch (props.type) {
            case 'segmentedControl':
              // this.item.segments = props.items.map(data => buildFromTemplate(data, this._onEvent));
              break;
            case 'scrubber':
              // this.item.segments = props.items.map(buildFromTemplate);
              break;
            default:
              // this.item.items = props.items.map(data => buildFromTemplate(data, this._onEvent));
              break;
          }
        }
      }
    }

    getItem = () => {
      return this.item;
    };

    render() {
      const { children, type, ...props } = this.props;
      return (
        <touch-bar-item getItem={this.getItem} type={TYPES[type]} {...props}>
          {children}
        </touch-bar-item>
      );
    }
  };
}

const TouchBarItem = createBarItem({});

for (const type of Object.keys(TYPES)) {
  TouchBarItem[TYPES[type]] = createBarItem({ type });
}

export default TouchBarItem;
