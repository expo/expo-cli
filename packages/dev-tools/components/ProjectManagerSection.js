import React from 'react';
import { css } from 'react-emotion';
import { DropTarget } from 'react-dnd';

import * as Constants from 'app/common/constants';
import { Trash } from 'app/common/svg';

import ProjectManagerSectionHeader from 'app/components/ProjectManagerSectionHeader';
import Boundary from 'app/components/Boundary';
import LoggerIcon from 'app/components/LoggerIcon';
import Log from 'app/components/Log';

const STYLES_BOUNDARY = css`
  height: 100%;
  width: 100%;
`;

const STYLES_CONTAINER = css`
  background: ${Constants.colors.black};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 2px;
`;

const STYLES_CONTAINER_SECTION_BAR = css`
  color: ${Constants.colors.white};
  min-height: 46px;
  width: 100%;
  flex-shrink: 0;
`;

const STYLES_CONTAINER_SECTION_FRAME = css`
  background: ${Constants.colors.foreground};
  color: ${Constants.colors.white};
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  padding: 16px;
  -webkit-overflow-scrolling: touch;

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${Constants.colors.foregroundAccent};
  }
`;

const STYLES_CONTAINER_SECTION_BAR_SELECTED = css`
  background: ${Constants.colors.primary};
`;

const STYLES_CONTAINER_SECTION_BAR_HOVER = css`
  background: ${Constants.colors.foregroundHover};
`;

const STYLES_CONTAINER_SECTION_FRAME_SELECTED = css``;

const STYLES_CONTAINER_SECTION_FRAME_HOVER = css`
  opacity: 0.5;
`;

const STYLES_CONTAINER_SELECTED = css`
  background: ${Constants.colors.primary};
`;

const STYLES_CONTAINER_HOVER = css`
  background: ${Constants.colors.foregroundHover};
`;

const STYLES_CLEAR_BUTTON = css`
  border: none;
  outline: none;
  cursor: pointer;
  background: transparent;
  color: currentcolor;
  padding: 16px;

  :hover {
    color: ${Constants.colors.white};
  }
`;

class ProjectManagerSection extends React.Component {
  componentDidMount() {
    this.scrollToEnd();
  }

  // TODO: When upgrading to React 16.3, switch to getSnapshotBeforeUpdate
  componentWillUpdate(nextProps) {
    let prevProps = this.props;
    if (
      this.refs.logContainer &&
      prevProps.data.messages.nodes.length < nextProps.data.messages.nodes.length
    ) {
      let { scrollHeight, scrollTop, clientHeight } = this.refs.logContainer;
      this.scrollOffsetFromBottom = scrollHeight - (scrollTop + clientHeight);
    } else {
      this.scrollOffsetFromBottom = null;
    }
  }

  componentDidUpdate() {
    if (this.scrollOffsetFromBottom != null && this.scrollOffsetFromBottom < 20) {
      this.scrollToEnd();
    }
  }

  scrollToEnd() {
    let element = this.refs.logContainer;
    if (element) {
      element.scrollTop = element.scrollHeight - element.clientHeight;
    }
  }

  _handleClearClick = e => {
    e.stopPropagation();
    this.props.onClearMessages(this.props.data);
  };

  render() {
    let headerElement;
    if (this.props.data) {
      headerElement = (
        <ProjectManagerSectionHeader
          id={this.props.data.id}
          isSelected={this.props.isSelected}
          actions={
            <button
              className={STYLES_CLEAR_BUTTON}
              title="Clear log (^L)"
              aria-label="Clear log"
              onClick={this._handleClearClick}>
              <Trash size="12px" />
            </button>
          }>
          <LoggerIcon
            type={this.props.data.type}
            style={{ marginRight: '8px', marginBottom: '2px' }}
          />
          &nbsp;
          {this.props.data.name}
        </ProjectManagerSectionHeader>
      );
    }

    let logElements = this.props.data.messages.nodes.map(message => (
      <Log key={message.id} message={message} />
    ));

    return this.props.connectDropTarget(
      <div className={STYLES_BOUNDARY}>
        <Boundary
          className={`
            ${STYLES_CONTAINER}
            ${this.props.isSelected ? STYLES_CONTAINER_SELECTED : ''}
            ${this.props.isOver ? STYLES_CONTAINER_HOVER : ''}
          `}
          onClick={this.props.onSectionSelect}
          onOutsideRectEvent={this.props.onSectionDismiss}
          captureResize={false}
          captureScroll={false}
          enabled={this.props.isSelected}>
          <div
            className={`
              ${STYLES_CONTAINER_SECTION_BAR}
              ${this.props.isSelected ? STYLES_CONTAINER_SECTION_BAR_SELECTED : ''}
              ${this.props.isOver ? STYLES_CONTAINER_SECTION_BAR_HOVER : ''}
            `}>
            {headerElement}
          </div>
          <div
            className={`
              ${STYLES_CONTAINER_SECTION_FRAME}
              ${this.props.isSelected ? STYLES_CONTAINER_SECTION_FRAME_SELECTED : ''}
              ${this.props.isOver ? STYLES_CONTAINER_SECTION_FRAME_HOVER : ''}
            `}
            ref="logContainer">
            {logElements}
          </div>
        </Boundary>
      </div>
    );
  }
}

const target = {
  drop(props, monitor) {
    const result = monitor.getItem();
    if (!props.data || result.id !== props.data.id) {
      props.onSectionDrag({ movedSourceId: result.id, targetSourceId: props.data.id });
    }
  },
};

const collect = (connect, monitor) => {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    isOverCurrent: monitor.isOver({ shallow: true }),
    canDrop: monitor.canDrop(),
  };
};

export default DropTarget('tab', target, collect)(ProjectManagerSection);
