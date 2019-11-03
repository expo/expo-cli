import { BrowserWindow } from 'electron';

const path = require('path');
const { ipcMain, TouchBar } = require('electron');

/* eslint-disable flowtype/require-parameter-type, flowtype/require-return-type */

const cwd = process.cwd();

// @ts-ignore
const isSegment = item => item.type === 'TouchBarSegmentedControl';
// @ts-ignore
const isScrubber = item => item.type === 'TouchBarScrubber';

class TouchBarWrapper {
  // @ts-ignore
  constructor(browserWindow) {
    // @ts-ignore
    this.browserWindow = browserWindow;

    this.getItem = this.getItem.bind(this);

    ipcMain.on('setTouchBar', (event, items) => {
      // @ts-ignore
      this.items = {};
      // @ts-ignore
      this.sender = event.sender;

      browserWindow.setTouchBar(
        new TouchBar({
          items: items.map(this.getItem),
        })
      );
    });

    ipcMain.on('updateTouchBar', this.updateItems.bind(this));
  }

  // @ts-ignore
  handleEvent(event, id) {
    // @ts-ignore
    return (...args) => {
      // @ts-ignore
      this.sender.send('TouchBarEvent', { event, id, args });
    };
  }

  // @ts-ignore
  getItem(item) {
    let props = {
      icon: this.getIcon(item.props.icon),
      click: this.handleEvent('onClick', item.id),
      change: this.handleEvent('onChange', item.id),
      select: this.handleEvent('onChange', item.id),
      highlight: this.handleEvent('onClick', item.id),
    };

    if (isSegment(item)) {
      // @ts-ignore
      props.segments = this.getSegments(item.props.items);
    }

    if (isScrubber(item)) {
      // @ts-ignore
      props.items = this.getSegments(item.props.items);
    }

    if (item.props.items && !isSegment(item) && !isScrubber(item)) {
      // @ts-ignore
      props.items = item.props.items.map(this.getItem);
    }

    // @ts-ignore
    return (this.items[item.id] = new TouchBar[item.type](Object.assign({}, item.props, props)));
  }

  // @ts-ignore
  getSegments(segments) {
    // @ts-ignore
    return segments.map(segment =>
      Object.assign({}, segment, {
        icon: this.getIcon(segment.icon),
      })
    );
  }

  // @ts-ignore
  getIcon(icon) {
    return icon ? path.join(cwd, icon) : null;
  }
  // @ts-ignore
  updateItems(event, item) {
    Object.keys(item.props).forEach(prop => {
      if (isSegment(item) && prop === 'items') {
        // @ts-ignore
        this.items[item.id].segments = item.props.segments;
      } else if (prop === 'icon') {
        // @ts-ignore
        this.items[item.id].icon = this.getIcon(item.props.icon);
      } else {
        // @ts-ignore
        this.items[item.id][prop] = item.props[prop];
      }
    });
  }
}

export default (browserWindow: BrowserWindow) => new TouchBarWrapper(browserWindow);

/* eslint-enable flowtype/require-parameter-type, flowtype/require-return-type */
