import { remote } from 'electron';
import * as React from 'react';

import DeclarativeElement from './DeclarativeElement';

const EVENTS = {
  'right-click': 'onRightClick',
  'double-click': 'onDoubleClick',
  click: 'onClick',
  'balloon-show': 'onBalloonShow', //Windows
  'balloon-click': 'onBalloonClick', //Windows
  'balloon-closed': 'onBalloonClosed', //Windows
  drop: 'onDrop', //macOS
  'drop-files': 'onDropFiles', //macOS
  'drop-text': 'onDropText', //macOS
  'drag-enter': 'onDragEnter', //macOS
  'drag-leave': 'onDragLeave', //macOS
  'drag-end': 'onDragEnd', //macOS
  'mouse-enter': 'onMouseEnter', //macOS
  'mouse-leave': 'onMouseLeave', //macOS
  'mouse-move': 'onMouseMove', //macOS
};

const { Tray: ElectronTray, Menu: ElectronMenu } = remote;

const constants = {
  get isMac() {
    const os = remote.require('os');
    return os.platform() === 'darwin';
  },
};

let trays = [];

remote.app.on('before-quit', () => {
  for (const tray of trays) {
    tray.destroy();
  }
  trays = [];
});

export class Tray extends DeclarativeElement {
  getTypes() {
    return ['tray-balloon', 'menu-item'];
  }
  componentDidMount() {
    this.updateContent();

    remote.app.on('before-quit', () => {
      if (this.tray) this.tray.destroy();
    });
  }
  componentDidUpdate() {
    this.updateContent();
  }
  componentWillUnmount() {
    if (this.tray) this.tray.destroy();
  }

  static defaultProps = {
    // highlightMode: 'never',
  };

  componentWillReceiveProps({ image, title, toolTip, pressedImage, highlightMode }) {
    if (highlightMode !== this.props.highlightMode) {
      this.highlightMode = highlightMode;
    }
    if (image !== this.props.image) {
      this.image = image;
    }
    if (pressedImage !== this.props.pressedImage) {
      this.pressedImage = pressedImage;
    }
    if (toolTip !== this.props.toolTip) {
      this.toolTip = toolTip;
    }
    if (title !== this.props.title) {
      this.title = title;
    }
  }

  set pressedImage(pressedImage) {
    try {
      this.getTray().setPressedImage(pressedImage);
    } catch (_) {}
  }

  set image(image) {
    if (image) {
      this.getTray().setImage(image);
    } else {
      this.getTray().destroy();
    }
  }

  set toolTip(toolTip) {
    try {
      this.getTray().setToolTip(toolTip);
    } catch (_) {}
  }

  set title(title) {
    try {
      this.getTray().setTitle(title);
    } catch (_) {}
  }

  set highlightMode(highlightMode) {
    try {
      this.getTray().setHighlightMode(highlightMode);
    } catch (_) {}
  }

  getBounds() {
    return this.getTray().getBounds();
  }

  getTray() {
    if (this.tray) return this.tray;

    this.tray = new ElectronTray(this.props.image);
    trays.push(this.tray);
    this.highlightMode = this.props.highlightMode;
    this.pressedImage = this.props.pressedImage;
    this.toolTip = this.props.toolTip;
    this.title = this.props.title;

    for (const event of Object.keys(EVENTS)) {
      this.tray.on(event, (...eventData) => {
        const propName = EVENTS[event];
        if (propName in this.props) {
          this.props[propName](...eventData);
        }
      });
    }

    return this.tray;
  }

  updateContent() {
    const json = this.getJSON();

    if (!constants.isMac) {
      const balloon = json.find(({ _type }) => _type === 'tray-balloon') || {};
      if (JSON.stringify(balloon) !== JSON.stringify(this.balloon || {})) {
        const { content, image, title } = balloon;
        this.getTray().displayBalloon({ content, image, title });
      }
      this._balloon = balloon;
    }

    // Menu

    const transformMenuItem = ({ onClick: click, ...element }) => {
      return {
        click,
        submenu: (element.submenu || []).map(transformMenuItem),
        ...element,
      };
    };

    const menuJson = json.filter(({ _type }) => _type === 'menu-item').map(transformMenuItem);

    if (JSON.stringify(menuJson || []) !== JSON.stringify(this.menuJson || [])) {
      this.menu = ElectronMenu.buildFromTemplate(menuJson);
      this.getTray().setContextMenu(this.menu);
    }

    this._menuJson = menuJson;

    if (this.props.show) {
      if (this.props.show === true) {
        this.getTray().popUpContextMenu();
      } else {
        try {
          this.getTray().popUpContextMenu([this.menu, this.props.show]);
        } catch (_) {}
      }
    }
  }
}

export const Balloon = props => <tray-balloon {...props} />;
