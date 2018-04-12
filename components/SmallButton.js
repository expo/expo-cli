import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const STYLES_SMALL_BUTTON = css`
  height: 28px;
  width: 28px;
  margin-left: 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const STYLES_SMALL_BUTTON_ACTIVE = css`
  border: 2px solid ${Constants.colors.border};
  color: ${Constants.colors.border};
`;

const STYLES_SMALL_BUTTON_DEFAULT = css`
  border: 2px solid ${Constants.colors.darkBorder};
  color: ${Constants.colors.darkButtonColor};
  cursor: pointer;
  transition: 200ms ease all;
  transition-property: border, color;

  :hover {
    border: 2px solid ${Constants.colors.border};
    color: ${Constants.colors.border};
  }
`;

export default class SmallButton extends React.Component {
  render() {
    return (
      <span
        {...this.props}
        className={`${STYLES_SMALL_BUTTON} ${this.props.isActive
          ? STYLES_SMALL_BUTTON_ACTIVE
          : STYLES_SMALL_BUTTON_DEFAULT}`}>
        {this.props.children}
      </span>
    );
  }
}
