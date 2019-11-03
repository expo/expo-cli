import * as React from 'react';
import PropTypes from 'prop-types';
import { remote } from 'electron';

export default function BrowserWindow(props) {
  const browserWindow = remote.getCurrentWindow();

  if (props.title) {
    browserWindow.setTitle(props.title);
  }

  if (props.icon) {
    browserWindow.setIcon(props.icon);
  }

  if (typeof props.left == 'number' && typeof props.top == 'number') {
    browserWindow.setPosition(props.left, props.top, props.animated);
  }

  if (props.width && props.height) {
    browserWindow.setSize(props.width, props.height, props.animated);
  }

  if (props.macOsVibrancy) {
    browserWindow.setVibrancy(props.macOsVibrancy);
  }

  switch (props.windowState) {
    case 'minimized':
      if (!browserWindow.isMinimized()) {
        browserWindow.setKiosk(false);
        browserWindow.setFullScreen(false);
        browserWindow.minimize();
      }
      break;

    case 'maximized':
      if (!browserWindow.isMaximized()) {
        browserWindow.setKiosk(false);
        browserWindow.setFullScreen(false);
        browserWindow.maximize();
      }
      break;

    case 'fullscreen':
      if (!browserWindow.isFullScreen()) {
        browserWindow.setKiosk(false);
        browserWindow.setFullScreen(true);
      }
      break;

    case 'kiosk':
      if (!browserWindow.isKiosk()) {
        browserWindow.setFullScreen(false);
        browserWindow.setKiosk(true);
      }

    case 'normal':
      break;
  }

  if (typeof props.resizable == 'boolean') {
    browserWindow.setResizable(props.resizable);
  }

  if (typeof props.movable == 'boolean') {
    browserWindow.setMovable(props.movable);
  }

  if (typeof props.minimizable == 'boolean') {
    browserWindow.setMinimizable(props.minimizable);
  }

  if (typeof props.maximizable == 'boolean') {
    browserWindow.setMaximizable(props.maximizable);
  }

  if (typeof props.fullscreenable == 'boolean') {
    browserWindow.setFullScreenable(props.fullscreenable);
  }

  if (typeof props.closable == 'boolean') {
    browserWindow.setClosable(props.closable);
  }

  if (typeof props.alwaysOnTop == 'boolean') {
    browserWindow.setAlwaysOnTop(props.alwaysOnTop);
  }

  if (typeof props.skipTaskbar == 'boolean') {
    browserWindow.setSkipTaskbar(props.skipTaskbar);
  }

  if (props.center) {
    browserWindow.center();
  }

  if (typeof props.visible == 'boolean') {
    if (props.visible) {
      browserWindow.show();
    } else {
      browserWindow.hide();
    }
  }

  return props.children;
}

BrowserWindow.propTypes = {
  title: PropTypes.string,
  visible: PropTypes.bool,
  icon: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  left: PropTypes.number,
  top: PropTypes.number,
  center: PropTypes.bool,
  animated: PropTypes.bool,
  movable: PropTypes.bool,
  resizable: PropTypes.bool,
  minimizable: PropTypes.bool,
  maximizable: PropTypes.bool,
  fullscreenable: PropTypes.bool,
  closable: PropTypes.bool,
  alwaysOnTop: PropTypes.bool,
  skipTaskbar: PropTypes.bool,
  windowState: PropTypes.oneOf('normal', 'minimized', 'maximized', 'fullscreen', 'kiosk'),
  macOsVibrancy: PropTypes.oneOf(
    'light',
    'dark',
    'titlebar',
    'selection',
    'menu',
    'popover',
    'sidebar',
    'medium-light',
    'ultra-dark',
    'appearance-based'
  ),
};
