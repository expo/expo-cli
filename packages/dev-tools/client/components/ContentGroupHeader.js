import { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import OptionsButton from './OptionsButton';

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

export default class ContentGroupHeader extends React.Component {
  render() {
    let simulatorElement;
    if (this.props.isSimulatorSupported) {
      simulatorElement = (
        <OptionsButton
          isDisabled={this.props.isDisabled}
          onClick={!this.props.isDisabled ? this.props.onSimulatorClick : null}>
          Simulator
        </OptionsButton>
      );
    }

    let deviceElement = (
      <OptionsButton
        isActive={this.props.isDeviceActive}
        isDisabled={this.props.isDisabled}
        onClick={!this.props.isDisabled ? this.props.onDeviceClick : null}>
        Device
      </OptionsButton>
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
