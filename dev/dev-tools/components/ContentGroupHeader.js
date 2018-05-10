import styled, { css } from 'react-emotion';

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

const STYLES_CONTAINER_RIGHT_ACTIVE = css`
  box-shadow: inset 0 -2px 0 ${Constants.colors.primary};
  border-left: 1px solid ${Constants.colors.border};

  :hover {
    background: ${Constants.colors.white};
  }
`;

export default class ContentGroupHeader extends React.Component {
  render() {
    let simulatorElement;
    if (this.props.isSimulatorSupported) {
      simulatorElement = (
        <span className={STYLES_CONTAINER_RIGHT} onClick={this.props.onSimulatorClick}>
          Simulator
        </span>
      );
    }

    let deviceElement = (
      <span
        className={`${STYLES_CONTAINER_RIGHT} ${this.props.isDeviceActive
          ? STYLES_CONTAINER_RIGHT_ACTIVE
          : ''}`}
        onClick={this.props.onDeviceClick}>
        Device
      </span>
    );

    return (
      <div className={STYLES_CONTAINER} onClick={this.props.onClick}>
        <span className={STYLES_CONTAINER_LEFT}>{this.props.children}</span>
        {simulatorElement}
        {deviceElement}
      </div>
    );
  }
}
