import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as Strings from 'app/common/strings';
import * as SVG from 'app/common/svg';

import { DragSource } from 'react-dnd';

import LoggerIcon from 'app/components/LoggerIcon';

const STYLES_TAB_SECTION = css``;

const STYLES_TAB_SECTION_CONTAINER = css`
  background: ${Constants.colors.white};
  border-bottom: 1px solid ${Constants.colors.border};
  padding: 13px 16px 14px 16px;
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

const STYLES_TAB_SECTION_CONTAINER_TITLE_IS_WARNING = css`
  color: ${Constants.colors.red};
`;

const STYLES_TAB_SECTION_CONTAINER_DESCRIPTION = css`
  font-family: ${Constants.fontFamilies.demi};
  font-size: 14px;
  margin-bottom: 8px;
`;

const STYLES_TAB_SECTION_CONTAINER_DESCRIPTION_IS_WARNING = css`
  color: ${Constants.colors.red};
`;

const STYLES_INDICATOR = css`
  color: ${Constants.colors.primary};
  font-family: ${Constants.fontFamilies.mono};
  text-transform: uppercase;
  font-size: 10px;
`;

// TODO(jim): Change icon based on device.
class ProjectManagerDeviceTab extends React.Component {
  render() {
    const { name, messages, id, __typename } = this.props.data;

    let type;
    switch (__typename) {
      case 'Issues': {
        type = 'issues';
        break;
      }
      case 'Process': {
        type = 'process';
        break;
      }
      case 'Device': {
        type = 'device';
        break;
      }
    }

    const deviceLogCount = messages.count;
    const deviceLastTimestamp =
      messages && messages.nodes.length
        ? `- ${Strings.formatTime(messages.nodes[messages.nodes.length - 1].time)}`
        : '';

    return this.props.connectDragSource(
      <div className={STYLES_TAB_SECTION} onClick={this.props.onClick}>
        <div className={STYLES_TAB_SECTION_CONTAINER}>
          <div
            className={`
            ${STYLES_TAB_SECTION_CONTAINER_DESCRIPTION}
            ${type === 'issues' ? STYLES_TAB_SECTION_CONTAINER_DESCRIPTION_IS_WARNING : ''}`}>
            {name}
          </div>
          <div
            className={`
            ${STYLES_TAB_SECTION_CONTAINER_TITLE}
            ${type === 'issues' ? STYLES_TAB_SECTION_CONTAINER_TITLE_IS_WARNING : ''}`}>
            <LoggerIcon type={type} style={{ marginRight: '8px', marginBottom: '2px' }} />
            {`${type} (${deviceLogCount}) ${deviceLastTimestamp}`}
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
      id: props.data.id,
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
