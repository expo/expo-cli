import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

import ContentGroup from 'app/components/ContentGroup';
import ContentGroupHeader from 'app/components/ContentGroupHeader';

const STYLES_URL_SECTION = css`
  padding: 16px;
`;

const STYLES_URL_SECTION_TOP = css`
  font-family: ${Constants.fontFamilies.bold};
  font-size: 12px;
  margin-bottom: 8px;
`;

const STYLES_URL_SECTION_BOTTOM = css`
  font-family: ${Constants.fontFamilies.regular};
  font-size: 12px;
`;

export default class ProjectManagerSidebarOptions extends React.Component {
  render() {
    return (
      <div>
        <ContentGroup
          header={
            <ContentGroupHeader
              onSimulatorClick={this.props.onSimulatorClickIOS}
              onDeviceClick={this.props.onDeviceClickIOS}>
              Open on iOS:
            </ContentGroupHeader>
          }
          isActive={this.props.isActiveDeviceIOS}>
          Viewing options will appear here.
        </ContentGroup>
        <ContentGroup
          header={
            <ContentGroupHeader
              onSimulatorClick={this.props.onSimulatorClickAndroid}
              onDeviceClick={this.props.onDeviceClickAndroid}>
              Open on Android:
            </ContentGroupHeader>
          }
          isActive={this.props.isActiveDeviceAndroid}>
          Viewing options will appear here.
        </ContentGroup>
        <div className={STYLES_URL_SECTION}>
          <div className={STYLES_URL_SECTION_TOP}>Development URL</div>
          <div className={STYLES_URL_SECTION_BOTTOM}>{this.props.url}</div>
        </div>
      </div>
    );
  }
}
