import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as SVG from 'app/common/svg';
import * as Constants from 'app/common/constants';

import ContentGroup from 'app/components/ContentGroup';
import ContentGroupHeader from 'app/components/ContentGroupHeader';
import NetworkGroupButton from 'app/components/NetworkGroupButton';
import InputWithButton from 'app/components/InputWithButton';
import QRCode from 'app/components/QRCode';

const STYLES_URL_SECTION = css`
  padding: 16px;
  border-bottom: 1px solid ${Constants.colors.border};
`;

const STYLES_URL_SECTION_BOTTOM = css`
  font-family: ${Constants.fontFamilies.regular};
  font-size: 12px;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const STYLES_URL_SECTION_BOTTOM_LEFT = css`
  flex-shrink: 0;
  padding-right: 8px;
`;

const STYLES_URL_SECTION_BOTTOM_RIGHT = css`
  font-family: ${Constants.fontFamilies.mono};
  font-size: 10px;
  padding-bottom: 3px;
  overflow-wrap: break-word;
  min-width: 25%;
  width: 100%;
`;

const STYLES_SUBTITLE = css`
  font-family: ${Constants.fontFamilies.mono};
  color: #777777;
  font-size: 11px;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const STYLES_CONTENT_GROUP = css`
  font-family: ${Constants.fontFamilies.demi};
  height: 32px;
  padding: 0 16px 0 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: 200ms ease all;

  :hover {
    background: ${Constants.colors.primary};
    color: ${Constants.colors.white};
    cursor: pointer;
  }
`;

const STYLES_CONTENT_GROUP_LEFT = css`
  min-width: 25%;
  width: 100%;
`;

const STYLES_CONTENT_GROUP_RIGHT = css`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

export default class ProjectManagerSidebarOptions extends React.Component {
  _handleShowPublishView = () => {
    this.props.onUpdateState({
      isPublishing: !this.props.isPublishing,
      isActiveDeviceIOS: false,
      isActiveDeviceAndroid: false,
    });
  };

  render() {
    const IOSHeader = (
      <ContentGroupHeader
        isDeviceActive={this.props.isActiveDeviceIOS}
        isSimulatorSupported={this.props.processInfo.isIosSimulatorSupported}
        onSimulatorClick={this.props.onSimulatorClickIOS}
        onDeviceClick={this.props.onDeviceClickIOS}>
        iOS
      </ContentGroupHeader>
    );

    const AndroidHeader = (
      <ContentGroupHeader
        isDeviceActive={this.props.isActiveDeviceAndroid}
        isSimulatorSupported={this.props.processInfo.isAndroidSimulatorSupported}
        onSimulatorClick={this.props.onSimulatorClickAndroid}
        onDeviceClick={this.props.onDeviceClickAndroid}>
        Android
      </ContentGroupHeader>
    );

    return (
      <div>
        <div className={STYLES_URL_SECTION}>
          <div className={STYLES_SUBTITLE}>Selected Connection</div>

          <NetworkGroupButton
            activeState={this.props.hostType}
            onHostTypeClick={this.props.onHostTypeClick}
          />

          <div className={STYLES_URL_SECTION_BOTTOM}>
            <div className={STYLES_URL_SECTION_BOTTOM_LEFT}>
              <SVG.Link size="12px" />
            </div>
            <div className={STYLES_URL_SECTION_BOTTOM_RIGHT}>{this.props.url}</div>
          </div>
        </div>

        <ContentGroup header={IOSHeader} isActive={this.props.isActiveDeviceIOS}>
          <div className={STYLES_SUBTITLE}>Send link to load</div>
          <InputWithButton
            placeholder="Enter email or number"
            value={this.props.recipient}
            onChange={this.props.onRecipientChange}
            onSubmit={this.props.onSubmitPhoneNumberOrEmail}>
            Send
          </InputWithButton>
        </ContentGroup>

        <ContentGroup header={AndroidHeader} isActive={this.props.isActiveDeviceAndroid}>
          <div className={STYLES_SUBTITLE}>Scan to load</div>
          <QRCode url={this.props.url} />
          <div className={STYLES_SUBTITLE} style={{ marginTop: 24 }}>
            Send link to load
          </div>
          <InputWithButton
            placeholder="Enter email or number"
            value={this.props.recipient}
            onChange={this.props.onRecipientChange}
            onSubmit={this.props.onSubmitPhoneNumberOrEmail}>
            Send
          </InputWithButton>
        </ContentGroup>

        <div className={STYLES_CONTENT_GROUP} onClick={this._handleShowPublishView}>
          <span className={STYLES_CONTENT_GROUP_LEFT}>Publish {this.props.title} to Expo.io</span>
          <span className={STYLES_CONTENT_GROUP_RIGHT}>
            <SVG.Arrow size="16px" />
          </span>
        </div>
      </div>
    );
  }
}
