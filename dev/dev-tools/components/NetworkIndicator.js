import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as SVG from 'app/common/svg';

const STYLES_INDICATOR = css`
  font-family: ${Constants.fontFamilies.mono};
  font-size: 10px;
  text-transform: uppercase;
  color: #999999;
  display: inline-flex;
  align-items: center;
`;

export default class NetworkIndicator extends React.Component {
  render() {
    if (this.props.isOffline) {
      return (
        <span className={STYLES_INDICATOR}>
          <SVG.WifiOff size="12px" style={{ marginLeft: 2, marginRight: 14 }} />
          <span style={{ paddingTop: 2 }}>You are developing offline</span>
        </span>
      );
    }

    return (
      <span className={STYLES_INDICATOR}>
        <SVG.Wifi
          size="12px"
          style={{ marginLeft: 2, marginRight: 14, color: Constants.colors.green }}
        />
        <span style={{ paddingTop: 2 }}>You are developing online</span>
      </span>
    );
  }
}
