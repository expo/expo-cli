import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as SVG from 'app/common/svg';

const STYLES_CONTAINER = css`
  font-family: ${Constants.fontFamilies.regular};
  color: ${Constants.colors.foregroundAccent};
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: flex-start;
  transition: 200ms ease all;
`;

const STYLES_BUTTON = css`
  font-family: ${Constants.fontFamilies.demi};
  cursor: pointer;
  padding: 2px 12px 0 12px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  :first-child {
    border-top: 1px solid ${Constants.colors.border};
    border-left: 1px solid ${Constants.colors.border};
    border-bottom: 1px solid ${Constants.colors.border};
    border-right: 1px solid ${Constants.colors.border};
    border-radius: 6px 0 0 6px;
  }

  border-top: 1px solid ${Constants.colors.border};
  border-bottom: 1px solid ${Constants.colors.border};

  :last-child {
    border-top: 1px solid ${Constants.colors.border};
    border-left: 1px solid ${Constants.colors.border};
    border-right: 1px solid ${Constants.colors.border};
    border-bottom: 1px solid ${Constants.colors.border};
    border-radius: 0 6px 6px 0;
  }

  :hover {
    background: ${Constants.colors.border};
  }
`;

const STYLES_BUTTON_ACTIVE = css`
  background: ${Constants.colors.primary};
  color: ${Constants.colors.white};

  :first-child {
    border-top: 1px solid ${Constants.colors.primary};
    border-left: 1px solid ${Constants.colors.primary};
    border-bottom: 1px solid ${Constants.colors.primary};
    border-right: 1px solid ${Constants.colors.primary};
    border-radius: 6px 0 0 6px;
  }

  border-top: 1px solid ${Constants.colors.primary};
  border-bottom: 1px solid ${Constants.colors.primary};

  :last-child {
    border-top: 1px solid ${Constants.colors.primary};
    border-left: 1px solid ${Constants.colors.primary};
    border-right: 1px solid ${Constants.colors.primary};
    border-bottom: 1px solid ${Constants.colors.primary};
    border-radius: 0 6px 6px 0;
  }

  :hover {
    background: ${Constants.colors.primary};
  }
`;

export default class NetworkGroupButton extends React.Component {
  _handleTunnelClick = () => this.props.onHostTypeClick('tunnel');
  _handleLANClick = () => this.props.onHostTypeClick('lan');
  _handleLocalhostClick = () => this.props.onHostTypeClick('localhost');

  render() {
    return (
      <div className={STYLES_CONTAINER} onClick={this.props.onClick}>
        <span
          className={`
            ${STYLES_BUTTON}
            ${this.props.activeState === 'tunnel' ? STYLES_BUTTON_ACTIVE : ''}
          `}
          onClick={this._handleTunnelClick}>
          Tunnel
        </span>
        <span
          className={`
            ${STYLES_BUTTON}
            ${this.props.activeState === 'lan' ? STYLES_BUTTON_ACTIVE : ''}
          `}
          onClick={this._handleLANClick}>
          LAN
        </span>
        <span
          className={`
            ${STYLES_BUTTON}
            ${this.props.activeState === 'localhost' ? STYLES_BUTTON_ACTIVE : ''}
          `}
          onClick={this._handleLocalhostClick}>
          Localhost
        </span>
      </div>
    );
  }
}
