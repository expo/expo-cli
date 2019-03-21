import { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const STYLES_SMALL_BUTTON = css`
  font-family: ${Constants.fontFamilies.demi};
  user-select: none;
  height: 28px;
  padding: 2px 8px 0 8px;
  margin-left: 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const STYLES_SMALL_BUTTON_ACTIVE = css`
  border: 2px solid ${Constants.colors.border};
  color: ${Constants.colors.border};
  transition: 200ms ease all;
  transition-property: border, color;

  :hover {
    border: 2px solid ${Constants.colors.primaryAccent};
    color: ${Constants.colors.primaryAccent};
  }
`;

const STYLES_SMALL_BUTTON_DEFAULT = css`
  border: 2px solid ${Constants.colors.darkBorder};
  color: ${Constants.colors.darkBorder};
  transition: 200ms ease all;
  transition-property: border, color;

  :hover {
    border: 2px solid ${Constants.colors.primaryAccent};
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
