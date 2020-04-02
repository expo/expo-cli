import { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const STYLES_LOADER = css`
  animation: rotate 1s infinite linear;
  display: inline-block;
  margin: 2px 0 0 0;
`;

export default class Loader extends React.Component {
  render() {
    return (
      <svg
        version="1.1"
        x="0px"
        y="0px"
        className={STYLES_LOADER}
        height={this.props.size}
        viewBox="0 0 100 100">
        <path
          fill={Constants.colors.black}
          d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50"
        />
      </svg>
    );
  }
}
