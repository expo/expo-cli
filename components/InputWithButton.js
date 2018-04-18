import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const STYLES_INPUT = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  height: 40px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
`;

const STYLES_INPUT_ELEMENT = css`
  font-family: ${Constants.fontFamilies.regular};
  border-radius: 4px 0 0 4px;
  font-size: 14px;
  min-width: 25%;
  width: 100%;
  height: 100%;
  border: 0;
  outline: 0;
  margin: 0;
  padding: 0 16px 0 16px;
  box-shadow: none;

  :focus {
    border: 0;
    outline: 0;
  }
`;

const STYLES_INPUT_BUTTON = css`
  font-family: ${Constants.fontFamilies.demi};
  text-transform: uppercase;
  border-radius: 0 4px 4px 0;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 16px 0 16px;
  height: 100%;
  background: ${Constants.colors.green};
  color: #ffffff;
  cursor: pointer;
`;

export default class InputWithButton extends React.Component {
  _handleChange = e => {
    this.props.onChange(e);
  };

  _handleSubmit = e => {
    this.props.onSubmit(e);
  };

  render() {
    return (
      <div className={STYLES_INPUT}>
        <input
          placeholder={this.props.placeholder}
          className={STYLES_INPUT_ELEMENT}
          onChange={this._handleChange}
          onSubmit={this._handleSubmit}
        />
        <span className={STYLES_INPUT_BUTTON} onClick={this._handleSubmit}>
          {this.props.children}
        </span>
      </div>
    );
  }
}
