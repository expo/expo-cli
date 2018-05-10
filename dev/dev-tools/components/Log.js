import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as Strings from 'app/common/strings';

const STYLES_LOG = css`
  font-family: ${Constants.fontFamilies.mono};
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 12px;
  margin-bottom: 12px;
`;

const STYLES_LOG_COL_TIMESTAMP = css`
  color: ${Constants.colors.logTimestamp};
  flex-shrink: 0;
  font-size: 10px;
  margin: 0 8px 4px 0;
  overflow-wrap: break-word;
`;

const STYLES_LOG_COL_CONTEXT = css`
  color: ${Constants.colors.logContext};
  flex-shrink: 0;
  font-size: 10px;
  margin: 0 8px 4px 0;
  text-transform: uppercase;
  overflow-wrap: break-word;
  margin-right: 8px;
`;

const STYLES_LOG_COL_CONTENT = css`
  width: 100%;
  min-width: 25%;
  line-height: 14px;
  overflow-wrap: break-word;
  white-space: pre-wrap;
`;

const STYLES_LOG_LEFT = css`
  flex-shrink: 0;
  width: 64px;
  opacity: 0.5;
`;

const STYLES_LOG_COL_LEVEL = css`
  flex-shrink: 0;
  font-size: 10px;
  margin: 1px 8px 4px 0;
  text-transform: uppercase;
  overflow-wrap: break-word;
  margin-right: 8px;
`;

const logLevelLabel = level => {
  switch (level) {
    case 'DEBUG':
      return 'Debug';
    case 'INFO':
      return 'Info';
    case 'WARN':
      return 'Warning';
    case 'ERROR':
      return 'Error';
  }
};

export default class Log extends React.Component {
  render() {
    return (
      <div className={STYLES_LOG}>
        <div className={STYLES_LOG_LEFT}>
          {this.props.level ? (
            <div
              className={STYLES_LOG_COL_LEVEL}
              style={{
                color: Constants.logLevel[this.props.level],
              }}>
              {logLevelLabel(this.props.level)}
            </div>
          ) : (
            undefined
          )}
          {this.props.time ? (
            <div className={STYLES_LOG_COL_TIMESTAMP}>
              {Strings.formatTimeMilitary(this.props.time)}
            </div>
          ) : (
            undefined
          )}
          {this.props.context ? (
            <div className={STYLES_LOG_COL_CONTEXT}>{this.props.context}</div>
          ) : (
            undefined
          )}
        </div>
        <div
          className={STYLES_LOG_COL_CONTENT}
          style={{ color: this.props.level ? Constants.logLevel[this.props.level] : undefined }}>
          {this.props.children}
        </div>
      </div>
    );
  }
}
