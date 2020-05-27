import { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

import { Toast } from 'app/components/GlobalToasts';
import UnstyledTextArea from 'react-textarea-autosize';

const STYLES_CONTAINER = css`
  position: relative;
  width: 100%;
  max-width: ${Constants.breakpoints.medium}px;
`;

const STYLES_LABEL = css`
  font-family: ${Constants.fontFamilies.mono};
  color: ${Constants.colors.darkBorder};
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  margin-bottom: 12px;
`;

const STYLES_TEXTAREA = css`
  background: ${Constants.colors.foregroundAccent};
  font-family: ${Constants.fontFamilies.regular};
  color: ${Constants.colors.darkInputColor};
  overflow-wrap: break-word;
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  box-sizing: border-box;
  display: block;
  width: 100%;
  padding: 8px 8px 8px 8px;
  border-radius: 4px;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
`;

const STYLES_TEXTAREA_ERROR = css`
  box-shadow: inset 0 0 4px ${Constants.colors.red};
`;

const STYLES_ERROR_POPOVER_ANCHOR = css`
  position: absolute;
  bottom: 32px;
  right: 0;
  width: 248px;
`;

export default class TextareaWithLabel extends React.Component {
  render() {
    const errorValuePopoverElement = this.props.errorValue ? (
      <div className={STYLES_ERROR_POPOVER_ANCHOR}>
        <Toast name="error">{this.props.errorValue}</Toast>
      </div>
    ) : null;

    const labelElement = this.props.label ? (
      <label className={STYLES_LABEL}>{this.props.label}</label>
    ) : null;

    return (
      <div style={this.props.style} className={STYLES_CONTAINER}>
        {errorValuePopoverElement}
        {labelElement}
        <UnstyledTextArea
          className={`${STYLES_TEXTAREA} ${this.props.errorValue ? STYLES_TEXTAREA_ERROR : ''}`}
          value={this.props.value}
          name={this.props.name}
          onChange={this.props.onChange}
          minRows={this.props.minRows}
        />
      </div>
    );
  }
}
