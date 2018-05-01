import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const STYLES_SMALL_BUTTON = css`
  user-select: none;
  height: 64px;
  width: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid #111111;
`;

const STYLES_SMALL_BUTTON_ACTIVE = css`
  background: #111111;
  color: #666666;
`;

const STYLES_SMALL_BUTTON_DEFAULT = css`
  color: ${Constants.colors.darkButtonColor};
  cursor: pointer;
  transition: 200ms ease all;
  transition-property: border, color;

  :hover {
    color: ${Constants.colors.primaryAccent};
  }
`;

export default class SmallButton extends React.Component {
  render() {
    return (
      <span
        onClick={this.props.onClick}
        className={`${STYLES_SMALL_BUTTON} ${this.props.isActive
          ? STYLES_SMALL_BUTTON_ACTIVE
          : STYLES_SMALL_BUTTON_DEFAULT}`}>
        {this.props.children}
      </span>
    );
  }
}
