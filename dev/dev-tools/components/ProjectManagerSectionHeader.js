import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import { DragSource } from 'react-dnd';

const STYLES_HEADER = css`
  font-family: ${Constants.fontFamilies.mono};
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 14px;
  padding: 16px;
`;

const STYLES_HEADER_CONTENT = css`
  width: 100%;
  min-width: 25%;
  font-size: 10px;
  text-transform: uppercase;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  display: flex;
  align-items: center;
`;

const STYLES_HEADER_SELECTED = css`
  color: ${Constants.colors.white};
`;

const STYLES_HEADER_DEFAULT = css`
  color: ${Constants.colors.darkText};
  transition: 200ms ease color;
  cursor: pointer;

  :hover {
    color: ${Constants.colors.white};
  }
`;

class ProjectManagerWindowHeader extends React.Component {
  render() {
    return this.props.connectDragSource(
      <div
        className={`
          ${STYLES_HEADER}
          ${this.props.isSelected ? STYLES_HEADER_SELECTED : STYLES_HEADER_DEFAULT}
        `}>
        <div className={STYLES_HEADER_CONTENT}>{this.props.children}</div>
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
