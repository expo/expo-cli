import { ansiToJson } from 'anser';
import * as Constants from 'app/common/constants';
import * as Strings from 'app/common/strings';
import hasAnsi from 'has-ansi';
import React from 'react';
import { css, cx } from 'react-emotion';

import StackTrace from './StackTrace';

const STYLES_LOG = css`
  font-family: ${Constants.fontFamilies.mono};
  display: flex;
  justify-content: flex-start;
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
  font-family: ${Constants.fontFamilies.mono};
  width: 100%;
  min-width: 25%;
  line-height: 14px;
  overflow-wrap: break-word;
  white-space: pre-wrap;
`;

const STYLES_LOG_LEFT = css`
  flex-shrink: 0;
  width: 64px;
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
  renderMessageContent({ msg, level }) {
    if (!hasAnsi(msg)) {
      return (
        <div
          className={cx(
            STYLES_LOG_COL_CONTENT,
            level ? css({ color: Constants.logLevel[level] }) : null
          )}>
          {msg}
        </div>
      );
    }
    const chunks = ansiToJson(msg, {
      remove_empty: true,
    });
    const content = chunks.map(chunk => {
      const style = {};
      if (chunk.bg) {
        style.backgroundColor = Constants.ansiColorOverrides[chunk.bg] || `rgb(${chunk.bg})`;
      }
      if (chunk.fg) {
        style.color = Constants.ansiColorOverrides[chunk.fg] || `rgb(${chunk.fg})`;
      }
      return <span style={style}>{chunk.content}</span>;
    });
    return <div className={STYLES_LOG_COL_CONTENT}>{content}</div>;
  }

  renderMessage(message) {
    if (message.includesStack) {
      try {
        const data = JSON.parse(message.msg);
        return (
          <React.Fragment>
            {this.renderMessageContent({ ...message, msg: data.message })}
            <StackTrace level={message.level} stack={data.stack} />
          </React.Fragment>
        );
      } catch {
        return this.renderMessageContent(message);
      }
    } else {
      return this.renderMessageContent(message);
    }
  }

  render() {
    const { message } = this.props;
    return (
      <div className={STYLES_LOG}>
        <div className={STYLES_LOG_LEFT}>
          {message.level ? (
            <div
              className={STYLES_LOG_COL_LEVEL}
              style={{
                color: Constants.logLevelWithAlpha[message.level],
              }}>
              {logLevelLabel(message.level)}
            </div>
          ) : undefined}
          {message.time ? (
            <div className={STYLES_LOG_COL_TIMESTAMP}>
              {Strings.formatTimeMilitary(message.time)}
            </div>
          ) : undefined}
          {this.props.context ? (
            <div className={STYLES_LOG_COL_CONTEXT}>{this.props.context}</div>
          ) : undefined}
        </div>
        <div>{this.renderMessage(message)}</div>
      </div>
    );
  }
}
