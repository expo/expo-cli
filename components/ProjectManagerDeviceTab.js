import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as SVG from 'app/common/svg';

import { DragSource } from 'react-dnd';

const STYLES_TAB_SECTION = css``;

const STYLES_TAB_SECTION_CONTAINER = css`
  background: ${Constants.colors.white};
  border-bottom: 1px solid ${Constants.colors.border};
  padding: 12px 16px 12px 16px;
  position: relative;
  transition: 200ms ease all;
  cursor: move;

  :hover {
    background: ${Constants.colors.border};
  }
`;

const STYLES_TAB_SECTION_CONTAINER_TITLE = css`
  font-family: ${Constants.fontFamilies.mono};
  text-transform: uppercase;
  font-size: 10px;
  display: flex;
  align-items: center;
`;

const STYLES_TAB_SECTION_CONTAINER_DESCRIPTION = css`
  font-family: ${Constants.fontFamilies.demi};
  font-size: 14px;
  margin-bottom: 8px;
`;

const STYLES_INDICATOR = css`
  color: ${Constants.colors.primary};
  font-family: ${Constants.fontFamilies.mono};
  text-transform: uppercase;
  font-size: 10px;
`;

const source = {
  beginDrag(props) {
    // NOTE(jim): we can override props here.
    console.log('beginDrag');

    /*
    What you return is the only information available to the drop targets about the drag source so it's important to pick the minimal data they need to know.
    */
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

class ProjectManagerDeviceTab extends React.Component {
  render() {
    return this.props.connectDragSource(
      <div className={STYLES_TAB_SECTION} onClick={this.props.onClick}>
        <div className={STYLES_TAB_SECTION_CONTAINER}>
          <div className={STYLES_TAB_SECTION_CONTAINER_DESCRIPTION}>{this.props.name}</div>
          <div className={STYLES_TAB_SECTION_CONTAINER_TITLE}>
            <SVG.Logs size="12px" style={{ marginRight: '8px', marginBottom: '2px' }} />
            {this.props.type}
          </div>
        </div>
      </div>
    );
  }
}

export default DragSource('tab', source, collect)(ProjectManagerDeviceTab);
