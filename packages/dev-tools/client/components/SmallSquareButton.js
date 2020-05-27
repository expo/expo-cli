import { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const STYLES_SMALL_BUTTON = css`
  border-left: 1px solid ${Constants.colors.black};
  user-select: none;
  height: 64px;
  width: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const STYLES_SMALL_BUTTON_ACTIVE = css`
  background: ${Constants.colors.black};
  color: ${Constants.colors.darkTextActive};
`;

const STYLES_SMALL_BUTTON_DEFAULT = css`
  color: ${Constants.colors.darkText};
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
        className={`${STYLES_SMALL_BUTTON} ${
          this.props.isActive ? STYLES_SMALL_BUTTON_ACTIVE : STYLES_SMALL_BUTTON_DEFAULT
        }`}>
        {this.props.children}
      </span>
    );
  }
}
