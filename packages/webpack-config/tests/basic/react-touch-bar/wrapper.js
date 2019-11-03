const path = require('path');
const { ipcMain, TouchBar } = require('electron');

/* eslint-disable flowtype/require-parameter-type, flowtype/require-return-type */

const cwd = process.cwd();
const isSegment = item => item.type === 'TouchBarSegmentedControl';
const isScrubber = item => item.type === 'TouchBarScrubber';

class TouchBarWrapper {
  constructor(browserWindow) {
    this.browserWindow = browserWindow;

    this.getItem = this.getItem.bind(this);

    ipcMain.on('setTouchBar', (event, items) => {
      this.items = {};
      this.sender = event.sender;

      browserWindow.setTouchBar(
        new TouchBar({
          items: items.map(this.getItem),
        })
      );
    });

    ipcMain.on('updateTouchBar', this.updateItems.bind(this));
  }

  handleEvent(event, id) {
    return (...args) => {
      this.sender.send('TouchBarEvent', { event, id, args });
    };
  }

  getItem(item) {
    let props = {
      icon: this.getIcon(item.props.icon),
      click: this.handleEvent('onClick', item.id),
      change: this.handleEvent('onChange', item.id),
      select: this.handleEvent('onChange', item.id),
      highlight: this.handleEvent('onClick', item.id),
    };

    if (isSegment(item)) {
      props.segments = this.getSegments(item.props.items);
    }

    if (isScrubber(item)) {
      props.items = this.getSegments(item.props.items);
    }

    if (item.props.items && !isSegment(item) && !isScrubber(item)) {
      props.items = item.props.items.map(this.getItem);
    }

    return (this.items[item.id] = new TouchBar[item.type](Object.assign({}, item.props, props)));
  }

  getSegments(segments) {
    return segments.map(segment =>
      Object.assign({}, segment, {
        icon: this.getIcon(segment.icon),
      })
    );
  }

  getIcon(icon) {
    return icon ? path.join(cwd, icon) : null;
  }

  updateItems(event, item) {
    Object.keys(item.props).forEach(prop => {
      if (isSegment(item) && prop === 'items') {
        this.items[item.id].segments = item.props.segments;
      } else if (prop === 'icon') {
        this.items[item.id].icon = this.getIcon(item.props.icon);
      } else {
        this.items[item.id][prop] = item.props[prop];
      }
    });
  }
}

module.exports = browserWindow => new TouchBarWrapper(browserWindow);

/* eslint-enable flowtype/require-parameter-type, flowtype/require-return-type */
