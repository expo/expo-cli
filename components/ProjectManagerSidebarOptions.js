import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

import ContentGroup from 'app/components/ContentGroup';
import ContentGroupHeader from 'app/components/ContentGroupHeader';
import InputWithButton from 'app/components/InputWithButton';
import QRCode from 'app/components/QRCode';

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
    const IOSHeader = (
      <ContentGroupHeader
        onSimulatorClick={this.props.onSimulatorClickIOS}
        onDeviceClick={this.props.onDeviceClickIOS}>
        Open on iOS:
      </ContentGroupHeader>
    );

    const AndroidHeader = (
      <ContentGroupHeader
        onSimulatorClick={this.props.onSimulatorClickAndroid}
        onDeviceClick={this.props.onDeviceClickAndroid}>
        Open on Android:
      </ContentGroupHeader>
    );

    return (
      <div>
        <ContentGroup header={IOSHeader} isActive={this.props.isActiveDeviceIOS}>
          <InputWithButton placeholder="Enter email or number">Send</InputWithButton>
        </ContentGroup>
        <ContentGroup header={AndroidHeader} isActive={this.props.isActiveDeviceAndroid}>
          <QRCode url="https://www.google.com" />
          <InputWithButton placeholder="Enter email or number">Send</InputWithButton>
        </ContentGroup>
        <div className={STYLES_URL_SECTION}>
          <div className={STYLES_URL_SECTION_TOP}>Development URL</div>
          <div className={STYLES_URL_SECTION_BOTTOM}>{this.props.url}</div>
        </div>
      </div>
    );
  }
}
