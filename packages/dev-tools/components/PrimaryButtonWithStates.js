import { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const STYLES_LARGE_BUTTON = css`
  font-family: ${Constants.fontFamilies.demi};
  color: ${Constants.colors.white};
  background: ${Constants.colors.primary};
  border-radius: 4px;
  padding: 12px 16px 10px 16px;
  font-size: 16px;
  line-height: 1;
  transtion: 200ms ease all;
  cursor: pointer;

  :hover {
    background: ${Constants.colors.primaryAccent};
  }
`;

const STYLES_LARGE_BUTTON_LOADING = css`
  font-family: ${Constants.fontFamilies.demi};
  color: ${Constants.colors.border};
  border: 1px solid ${Constants.colors.border};
  border-radius: 4px;
  padding: 12px 16px 10px 16px;
  font-size: 16px;
  line-height: 1;
  transtion: 200ms ease all;
  cursor: wait;
`;

const STYLES_LARGE_BUTTON_DISABLED = css`
  font-family: ${Constants.fontFamilies.demi};
  color: ${Constants.colors.border};
  border: 1px solid ${Constants.colors.border};
  background: transparent;
  border-radius: 4px;
  padding: 12px 16px 10px 16px;
  font-size: 16px;
  line-height: 1;
  transtion: 200ms ease all;
  cursor: no-drop;
`;

export default class PrimaryButton extends React.Component {
  _getButtonClassNameFromDecoration = decoration => {
    if (decoration === 'LOADING') {
      return STYLES_LARGE_BUTTON_LOADING;
    }

    if (decoration === 'ERROR') {
      return STYLES_LARGE_BUTTON_DISABLED;
    }

    return STYLES_LARGE_BUTTON;
  };

  render() {
    const { text, decoration } = this.props.states[this.props.currentState];
    const className = this._getButtonClassNameFromDecoration(decoration);
    const onClick =
      decoration !== 'ERROR' && decoration !== 'LOADING' ? this.props.onClick : () => {};

    return (
      <span role="button" className={className} onClick={onClick}>
        {text}
      </span>
    );
  }
}
