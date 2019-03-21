import { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as Strings from 'app/common/strings';

import { DragSource } from 'react-dnd';

import LoggerIcon from 'app/components/LoggerIcon';

const STYLES_TAB_SECTION = css`
  display: flex;
  width: 100%;
  flex-direction: row;
  background: ${Constants.colors.white};
  padding: 13px 16px 14px 16px;
  border-bottom: 1px solid ${Constants.colors.border};
  align-items: center;

  :hover {
    background: ${Constants.colors.border};
  }

  cursor: move;
  transition: 200ms ease all;
`;

const STYLES_TAB_SECTION_CONTAINER = css`
  flex: 1 1;
  position: relative;
`;

const STYLES_TAB_SECTION_CONTAINER_TITLE = css`
  font-family: ${Constants.fontFamilies.mono};
  text-transform: uppercase;
  font-size: 10px;
  display: flex;
  align-items: center;
`;

const STYLES_TAB_SECTION_CONTAINER_DESCRIPTION = css`
  display: flex;
  font-family: ${Constants.fontFamilies.demi};
  font-size: 14px;
  line-height: 18px;
  margin-bottom: 8px;
`;

function colorFromIssueLevel(messages) {
  if (!messages || !messages.length) {
    return null;
  }
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].level === 'ERROR') {
      return Constants.logLevel.ERROR;
    }
  }
  return Constants.logLevel.WARN;
}

// TODO(jim): Change icon based on device.
class ProjectManagerDeviceTab extends React.Component {
  renderUnreadCount() {
    const unreadCount = this.props.source.messages.unreadCount;
    if (unreadCount && unreadCount > 0) {
      return `(${unreadCount}) `;
    } else {
      return '';
    }
  }

  render() {
    const { source } = this.props;
    const { messages, __typename: type } = source;
    const deviceLastTimestamp = messages.nodes.length
      ? `- ${Strings.formatTime(messages.nodes[messages.nodes.length - 1].time)}`
      : '';
    const colorStyle = type === 'Issues' ? css({ color: colorFromIssueLevel(messages.nodes) }) : '';

    return this.props.connectDragSource(
      <div className={STYLES_TAB_SECTION} onClick={this.props.onClick}>
        <div className={STYLES_TAB_SECTION_CONTAINER}>
          <div
            className={`
            ${STYLES_TAB_SECTION_CONTAINER_DESCRIPTION}
            ${colorStyle}`}>
            {source.name}
          </div>
          <div
            className={`
            ${STYLES_TAB_SECTION_CONTAINER_TITLE}
            ${colorStyle}`}>
            <LoggerIcon type={type} style={{ marginRight: '8px', marginBottom: '2px' }} />
            {`${type} ${this.renderUnreadCount()}${deviceLastTimestamp}`}
          </div>
        </div>
      </div>
    );
  }
}

const source = {
  beginDrag(props) {
    props.onUpdateState({ isPublishing: false });

    return {
      id: props.source.id,
    };
  },
};

const collect = (connect, monitor) => {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  };
};

export default DragSource('tab', source, collect)(ProjectManagerDeviceTab);
