/* eslint-env browser */

import React from 'react';
import PropTypes from 'prop-types';
import PopupMenu from './PopupMenu';

export default class ContextMenu extends React.PureComponent {
  state = {
    target: '',
  };

  componentDidMount() {
    const { contextId } = this.props;
    const context = contextId ? document.getElementById(contextId) : document.body;
    context.addEventListener('contextmenu', event => {
      this.openContextMenu(event);
    });

    const menu = document.getElementById('contextMenu');
    menu.addEventListener('mouseleave', () => {
      this.closeContextMenu();
    });
  }

  openContextMenu = event => {
    event.preventDefault();
    this.setState({ target: event.target });

    const xOffset = Math.max(document.documentElement.scrollLeft, document.body.scrollLeft);
    const yOffset = Math.max(document.documentElement.scrollTop, document.body.scrollTop);

    this.setState({ x: xOffset, y: yOffset });

    const menu = document.getElementById('contextMenu');

    menu.style.cssText =
      menu.style.cssText +
      `left: ${event.clientX + xOffset}px;` +
      `top: ${event.clientY + yOffset}px;` +
      'visibility: visible;';
  };

  closeContextMenu = () => {
    const menu = document.getElementById('contextMenu');
    menu.style.cssText = menu.style.cssText + 'visibility: hidden;';
  };

  getItems = () => {
    const { children, closeOnClick } = this.props;
    const items = React.Children.toArray(children);
    if (closeOnClick) {
      return items.map(item => ({
        ...item,
        onClick: () => {
          this.closeContextMenu();
          item.onClick();
        },
      }));
    } else {
      return items;
    }
  };

  render() {
    return (
      <div
        id="contextMenu"
        style={{
          position: 'absolute',
          display: 'flex',
          zIndex: 1,
          flexFlow: 'column',
          border: '1px solid rgba(0,0,0,0.15)',
          borderRadius: '2px',
          boxShadow: '0 1px 1px 1px rgba(0,0,0,0.05)',
          padding: '10px 15px',
          background: '#f8f8f8',
          visibility: 'hidden',
        }}>
        <PopupMenu x={this.state.xOffset} y={this.state.yOffset}>
          {this.getItems()}
        </PopupMenu>
      </div>
    );
  }
}

ContextMenu.propTypes = {
  //   items: PropTypes.arrayOf(
  //     PropTypes.shape({
  //       label: PropTypes.string.isRequired,
  //       onClick: PropTypes.func.isRequired,
  //       icon: PropTypes.string,
  //     })
  //   ),
  //   contextId: PropTypes.string.isRequired,
  closeOnClick: PropTypes.bool,
};

ContextMenu.defaultProps = {
  items: [],
  closeOnClick: false,
};
