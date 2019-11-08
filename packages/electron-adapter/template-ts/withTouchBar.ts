import { BrowserWindow, ipcMain, TouchBar } from 'electron';
import path from 'path';

const cwd = process.cwd();

interface TouchBarItem {
  id: string;
  props: { icon?: string; items?: any[]; segments?: any[] };
}

interface Segment extends TouchBarItem {
  segments: any[];
  type: 'TouchBarSegmentedControl';
}

interface Scrubber extends TouchBarItem {
  type: 'TouchBarScrubber';
  items: any[];
}

type AnyItem = TouchBarItem | Segment | Scrubber;

const isSegment = (item: any): item is Segment => item && item.type === 'TouchBarSegmentedControl';

const isScrubber = (item: any): item is Scrubber => item && item.type === 'TouchBarScrubber';

class TouchBarWrapper {
  items: { [key: string]: any } = {};

  sender: any;

  constructor(public browserWindow: BrowserWindow) {
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

  handleEvent = (event: any, id: string): ((...args: any[]) => void) => {
    return (...args: any[]): void => {
      this.sender.send('TouchBarEvent', { event, id, args });
    };
  };

  getItem = (item: AnyItem) => {
    let props: { [key: string]: any } = {
      icon: this.getIcon(item.props.icon),
      click: this.handleEvent('onClick', item.id),
      change: this.handleEvent('onChange', item.id),
      select: this.handleEvent('onChange', item.id),
      highlight: this.handleEvent('onClick', item.id),
    };

    if (isSegment(item)) {
      props.segments = this.getSegments(item.props.items!);
    } else if (isScrubber(item)) {
      props.items = this.getSegments(item.props.items!);
    }

    if (item.props.items && !isSegment(item) && !isScrubber(item)) {
      // @ts-ignore
      props.items = item.props.items.map(this.getItem);
    }

    // @ts-ignore
    return (this.items[item.id] = new TouchBar[item.type](Object.assign({}, item.props, props)));
  };

  getSegments(segments: any[]): any[] {
    return segments.map(segment =>
      Object.assign({}, segment, {
        icon: this.getIcon(segment.icon),
      })
    );
  }

  getIcon(icon?: string): string | null {
    return icon ? path.join(cwd, icon) : null;
  }

  updateItems(event: any, item: AnyItem): void {
    for (const prop of Object.keys(item.props)) {
      if (isSegment(item) && prop === 'items') {
        this.items[item.id].segments = item.props.segments!;
      } else if (prop === 'icon') {
        this.items[item.id].icon = this.getIcon(item.props.icon);
      } else {
        // @ts-ignore
        this.items[item.id][prop] = item.props[prop];
      }
    }
  }
}

export default (browserWindow: BrowserWindow) => new TouchBarWrapper(browserWindow);
