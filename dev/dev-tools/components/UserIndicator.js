import React from 'react';
import { css } from 'react-emotion';

import * as Constants from 'app/common/constants';

const STYLES_INDICATOR = css`
  font-family: ${Constants.fontFamilies.mono};
  color: ${Constants.colors.darkText};
  font-size: 10px;
  text-transform: uppercase;
  padding-top: 2px;
`;

const STYLES_USERNAME = css`
  color: ${Constants.colors.green};
`;

export default class UserIndicator extends React.Component {
  render() {
    if (!this.props.user) {
      return <span className={STYLES_INDICATOR}>Logged out</span>;
    }
    return (
      <span className={STYLES_INDICATOR}>
        Logged in as <span className={STYLES_USERNAME}>{this.props.user.username}</span>
      </span>
    );
  }
}
