import { css } from 'react-emotion';
import { connect } from 'react-redux';

import * as React from 'react';
import * as SVG from 'app/common/svg';
import * as Constants from 'app/common/constants';

const STYLES_TOAST_CONTAINER = css`
  max-width: ${Constants.breakpoints.sidebar}px;
  line-height: 1.5;
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 100%;
`;

const STYLES_TOAST = css`
  background: ${Constants.colors.white};
  box-shadow: 0 1px 4px rgba(0, 0, 30, 0.3);
  user-select: none;
  width: 100%;
  border-radius: 4px;
  margin-top: 16px;
  transition: 200ms ease all;
  animation: 400ms ease fadeInRight;
`;

const STYLES_TOAST_BODY = css`
  font-family: ${Constants.fontFamilies.regular};
  color: ${Constants.colors.black};
  font-size: 12px;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  padding: 16px;
`;

const STYLES_TOAST_TOP = css`
  font-family: ${Constants.fontFamilies.mono};
  text-transform: uppercase;
  font-size: 10px;
  height: 30px;
  padding: 0 16px 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 4px 4px 0 0;
`;

const STYLES_TOAST_TOP_NORMAL = css`
  border-bottom: 1px solid ${Constants.colors.border};
  background: ${Constants.colors.border};
`;

const STYLES_TOAST_TOP_WARNING = css`
  border-bottom: 1px solid ${Constants.colors.red};
  background: ${Constants.colors.red};
  color: ${Constants.colors.white};
`;

const STYLES_TOAST_TOP_SUCCESS = css`
  border-bottom: 1px solid ${Constants.colors.green};
  background: ${Constants.colors.green};
  color: ${Constants.colors.white};
`;

const STYLES_TOAST_TOP_ALERT = css`
  border-bottom: 1px solid ${Constants.colors.yellow};
  background: ${Constants.colors.yellow};
  color: ${Constants.colors.white};
`;

const STYLES_TOAST_TOP_LEFT = css`
  min-width: 25%;
  padding-top: 4px;
  width: 100%;
  overflow-wrap: break-word;
  width: 100%;
`;

const STYLES_TOAST_TOP_RIGHT = css`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 0 16px;
  cursor: pointer;
`;

export class Toast extends React.Component {
  static defaultProps = {
    name: 'notice',
  };

  render() {
    const dismissElement = this.props.onDismiss ? (
      <span className={STYLES_TOAST_TOP_RIGHT} onClick={this.props.onDismiss}>
        <SVG.Dismiss size="16px" />
      </span>
    ) : null;

    return (
      <div className={STYLES_TOAST} style={this.props.style}>
        <header
          className={`${STYLES_TOAST_TOP} 
            ${
              this.props.name === 'notice' || this.props.name === 'info'
                ? STYLES_TOAST_TOP_NORMAL
                : ''
            }
            ${
              this.props.name === 'warning' || this.props.name === 'error'
                ? STYLES_TOAST_TOP_WARNING
                : ''
            }
            ${this.props.name === 'success' ? STYLES_TOAST_TOP_SUCCESS : ''}
            ${this.props.name === 'alert' ? STYLES_TOAST_TOP_ALERT : ''}`}>
          <span className={STYLES_TOAST_TOP_LEFT}>{this.props.name}</span>
          {dismissElement}
        </header>
        <div className={STYLES_TOAST_BODY}>{this.props.children}</div>
      </div>
    );
  }
}

export default connect(state => {
  return {
    toasts: state.toasts,
  };
})(
  class GlobalToasts extends React.Component {
    _handleDismiss = id => {
      this.props.dispatch({
        type: 'REMOVE_TOAST',
        id,
      });
    };

    render() {
      return (
        <div className={STYLES_TOAST_CONTAINER}>
          {this.props.toasts.map(t => {
            return (
              <Toast key={t.id} name={t.name} onDismiss={() => this._handleDismiss(t.id)}>
                {t.text}
              </Toast>
            );
          })}
        </div>
      );
    }
  }
);
