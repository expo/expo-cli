import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import { DragSource } from 'react-dnd';

const STYLES_LOG = css`
  font-family: 'prototype-mono';
  display: flex;
  cursor: pointer;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 14px;
  padding: 16px;
`;

const STYLES_LOG_COL_CONTEXT = css`
  color: ${Constants.colors.darkButtonColor};
  flex-shrink: 0;
  font-size: 10px;
  margin: 0 8px 4px 0;
  text-transform: uppercase;
  overflow-wrap: break-word;
  margin-right: 8px;
`;

const STYLES_LOG_COL_CONTENT = css`
  color: ${Constants.colors.darkButtonColor};
  width: 100%;
  min-width: 25%;
  font-size: 10px;
  text-transform: uppercase;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  display: flex;
  align-items: center;
`;

const STYLES_LOG_LEFT = css`
  flex-shrink: 0;
  width: 100px;
`;

class ProjectManagerWindowHeader extends React.Component {
  render() {
    return this.props.connectDragSource(
      <div className={STYLES_LOG}>
        <div className={STYLES_LOG_COL_CONTENT}>{this.props.children}'s logs</div>
      </div>
    );
  }
}

const source = {
  beginDrag(props) {
    return {
      id: props.id,
    };
  },
};

const collect = (connect, monitor) => {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  };
};

export default DragSource('tab', source, collect)(ProjectManagerWindowHeader);
