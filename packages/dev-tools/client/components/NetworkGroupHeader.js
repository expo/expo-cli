import { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const STYLES_CONTAINER = css`
  font-family: ${Constants.fontFamilies.regular};
  color: ${Constants.colors.foregroundAccent};
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: space-between;
  transition: 200ms ease all;
`;

const STYLES_CONTAINER_LEFT = css`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 16px;
  min-width: 25%;
  width: 100%;
`;

const STYLES_CONTAINER_RIGHT = css`
  font-family: ${Constants.fontFamilies.demi};
  border-left: 1px solid ${Constants.colors.border};
  flex-shrink: 0;
  cursor: pointer;
  padding: 0 16px 0 16px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    background: ${Constants.colors.border};
  }
`;

export default class NetworkGroupHeader extends React.Component {
  render() {
    return (
      <div className={STYLES_CONTAINER} onClick={this.props.onClick}>
        <span className={STYLES_CONTAINER_LEFT}>{this.props.children}</span>
        <span className={STYLES_CONTAINER_RIGHT} onClick={this.props.onTunnelClick}>
          Tunnel
        </span>
        <span className={STYLES_CONTAINER_RIGHT} onClick={this.props.onLANClick}>
          LAN
        </span>
        <span className={STYLES_CONTAINER_RIGHT} onClick={this.props.onLocalhostClick}>
          Local
        </span>
      </div>
    );
  }
}
