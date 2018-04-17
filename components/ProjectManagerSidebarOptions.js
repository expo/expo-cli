import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

import ContentGroup from 'app/components/ContentGroup';
import ContentGroupHeader from 'app/components/ContentGroupHeader';
import NetworkGroupHeader from 'app/components/NetworkGroupHeader';
import InputWithButton from 'app/components/InputWithButton';
import QRCode from 'app/components/QRCode';

const STYLES_URL_SECTION = css`
  padding: 16px;
  border-bottom: 1px solid ${Constants.colors.border};
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

const STYLES_SUBTITLE = css`
  font-family: ${Constants.fontFamilies.mono};
  color: #777777;
  font-size: 12px;
  text-transform: uppercase;
  margin-bottom: 16px;
`;

export default class ProjectManagerSidebarOptions extends React.Component {
  render() {
    const IOSHeader = (
      <ContentGroupHeader
        onSimulatorClick={this.props.onSimulatorClickIOS}
        onDeviceClick={this.props.onDeviceClickIOS}>
        Run on iOS:
      </ContentGroupHeader>
    );

    const AndroidHeader = (
      <ContentGroupHeader
        onSimulatorClick={this.props.onSimulatorClickAndroid}
        onDeviceClick={this.props.onDeviceClickAndroid}>
        Run on Android:
      </ContentGroupHeader>
    );

    const ConnectionHeader = (
      <NetworkGroupHeader
        onLocalhostClick={this.props.onNetworkLocalhostClick}
        onTunnelClick={this.props.onNetworkTunnelClick}
        onLANClick={this.props.onNetworkLANClick}>
        Connection:
      </NetworkGroupHeader>
    );

    return (
      <div>
        <ContentGroup header={IOSHeader} isActive={this.props.isActiveDeviceIOS}>
          <div className={STYLES_SUBTITLE}>Send link to load</div>
          <InputWithButton placeholder="Enter email or number">Send</InputWithButton>
        </ContentGroup>
        <ContentGroup header={AndroidHeader} isActive={this.props.isActiveDeviceAndroid}>
          <div className={STYLES_SUBTITLE}>Scan to load</div>
          <QRCode url="https://www.google.com" />
          <div className={STYLES_SUBTITLE} style={{ marginTop: 24 }}>
            Send link to load
          </div>
          <InputWithButton placeholder="Enter email or number">Send</InputWithButton>
        </ContentGroup>
        <div className={STYLES_URL_SECTION}>
          <div className={STYLES_URL_SECTION_TOP}>Development URL</div>
          <div className={STYLES_URL_SECTION_BOTTOM}>{this.props.url}</div>
        </div>
        <ContentGroup header={ConnectionHeader} />
      </div>
    );
  }
}
