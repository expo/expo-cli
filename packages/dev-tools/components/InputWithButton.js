import { css } from 'react-emotion';

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
  background: ${Constants.colors.green};
  color: ${Constants.colors.white};
  border-radius: 0 4px 4px 0;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 16px 0 16px;
  height: 100%;
  cursor: pointer;
  transition: 200ms ease opacity;
  opacity: 1;

  :hover {
    opacity: 0.9;
  }
`;

const STYLES_INPUT_BUTTON_SUBMITTING = css`
  font-family: ${Constants.fontFamilies.demi};
  background: ${Constants.colors.white};
  color: ${Constants.colors.black};
  border-left: 1px solid ${Constants.colors.border};
  border-radius: 0 4px 4px 0;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 16px 0 16px;
  height: 100%;
  cursor: wait;
`;

export default class InputWithButton extends React.Component {
  static defaultProps = {
    onValidation: () => true,
  };

  state = {
    isSubmitting: false,
  };

  _handleChange = e => {
    this.props.onChange(e);
  };

  _handleSubmit = async e => {
    this.setState({ isSubmitting: true });
    const isValidated = await this.props.onValidation(this.props.value);

    if (isValidated) {
      await this.props.onSubmit(e);
    }

    this.setState({ isSubmitting: false });
  };

  _handleKeyUp = async e => {
    if (e.which === 13) {
      await this._handleSubmit(e);
      return;
    }

    if (this.props.onKeyUp) {
      this.props.onKeyUp(e);
    }
  };

  render() {
    return (
      <div className={STYLES_INPUT}>
        <input
          placeholder={this.props.placeholder}
          value={this.props.value}
          className={STYLES_INPUT_ELEMENT}
          onChange={this._handleChange}
          onKeyUp={this._handleKeyUp}
          onSubmit={this._handleSubmit}
        />
        {!this.state.isSubmitting ? (
          <span className={STYLES_INPUT_BUTTON} onClick={this._handleSubmit}>
            {this.props.children}
          </span>
        ) : (
          <span className={STYLES_INPUT_BUTTON_SUBMITTING}>Sending...</span>
        )}
      </div>
    );
  }
}
