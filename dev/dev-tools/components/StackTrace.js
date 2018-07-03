import React from 'react';
import { css, cx } from 'react-emotion';
import findLastIndex from 'lodash/findLastIndex';

import * as Constants from 'app/common/constants';

const STYLES = css`
  font-family: ${Constants.fontFamilies.mono};
  width: 100%;
  min-width: 25%;
  line-height: 14px;
  overflow-wrap: break-word;
  white-space: pre-wrap;
`;

const STYLES_LINK = css`
  text-decoration: none;
  color: currentcolor;
`;

const isLibraryFrame = line => line && line.startsWith('node_modules');

export default class StackTrace extends React.Component {
  state = { collapsed: true };

  handleExpandClick = e => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ collapsed: false });
  };

  render() {
    const level = this.props.level;
    let lines = this.props.stack.split(/\r?\n/);
    if (/^node_modules\/react-native\/Libraries\/ReactNative\/YellowBox\.js/.test(lines[0])) {
      lines.shift();
    }
    if (/^node_modules\/expo\/src\/Expo\.js:.+ in warn/.test(lines[0])) {
      lines.shift();
    }
    const lastAppCodeFrameIndex = findLastIndex(lines, line => !isLibraryFrame(line));
    const frames = lines.map(line => `  ${line}\n`);
    const shownFrames =
      lastAppCodeFrameIndex === -1 ? frames : frames.slice(0, lastAppCodeFrameIndex + 3);
    const hiddenFrames =
      lastAppCodeFrameIndex === -1 ? [] : frames.slice(lastAppCodeFrameIndex + 2);
    return (
      <div className={cx(STYLES, css({ color: level && Constants.logLevel[level] }))}>
        {'\n'}Stack trace:{'\n'}
        {shownFrames}
        {this.state.collapsed ? (
          <a className={STYLES_LINK} href="#" onClick={this.handleExpandClick}>
            {'  '}...
          </a>
        ) : (
          hiddenFrames
        )}
      </div>
    );
  }
}
