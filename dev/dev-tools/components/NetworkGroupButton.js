import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as SVG from 'app/common/svg';

import Loader from 'app/components/Loader';

const STYLES_CONTAINER = css`
  font-family: ${Constants.fontFamilies.regular};
  color: ${Constants.colors.foregroundAccent};
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: flex-start;
  transition: 200ms ease all;
`;

const STYLES_LOADER = css`
  border: 1px solid ${Constants.colors.border};
  border-radius: 6px;
  height: 30px;
  width: 189.18px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px 0 12px;
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

const STYLES_BUTTON_DISABLED = css`
  color: ${Constants.colors.border};
  cursor: default;

  :hover {
    background: none;
  }
`;

export default class NetworkGroupButton extends React.Component {
  _handleTunnelClick = () => {
    this.props.onUpdateState({ isPublishing: false });
    this.props.onHostTypeClick('tunnel');
  };
  _handleLANClick = () => {
    this.props.onUpdateState({ isPublishing: false });
    this.props.onHostTypeClick('lan');
  };
  _handleLocalhostClick = () => {
    this.props.onUpdateState({ isPublishing: false });
    this.props.onHostTypeClick('localhost');
  };

  render() {
    if (this.props.loading) {
      return (
        <div className={STYLES_CONTAINER}>
          <div className={STYLES_LOADER}>
            <Loader size="24px" />
          </div>
        </div>
      );
    }

    return (
      <div className={STYLES_CONTAINER} onClick={this.props.onClick}>
        <span
          className={`
            ${STYLES_BUTTON}
            ${this.props.activeState === 'tunnel' ? STYLES_BUTTON_ACTIVE : ''}
            ${!this.props.isOnline ? STYLES_BUTTON_DISABLED : ''}
          `}
          onClick={this.props.isOnline ? this._handleTunnelClick : null}>
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
