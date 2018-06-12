import styled, { css } from 'react-emotion';
import copyToClipboard from 'copy-to-clipboard';

import * as React from 'react';
import * as SVG from 'app/common/svg';
import * as Constants from 'app/common/constants';

import ContentGroup from 'app/components/ContentGroup';
import ContentGroupHeader from 'app/components/ContentGroupHeader';
import NetworkGroupButton from 'app/components/NetworkGroupButton';
import InputWithButton from 'app/components/InputWithButton';
import SettingsControl from 'app/components/SettingsControl';
import QRCode from 'app/components/QRCode';

const STYLES_CONNECTION_SECTION = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const STYLES_CONNECTION_SECTION_LEFT = css`
  min-width: 25%;
  width: 100%;
`;

const STYLES_CONNECTION_SECTION_RIGHT = css`
  flex-shrink: 0;
`;

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
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  min-width: 25%;
  width: 100%;
`;

const STYLES_SUBTITLE = css`
  font-family: ${Constants.fontFamilies.mono};
  color: #555555;
  font-size: 10px;
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

  _handleCopyLink = () => {
    copyToClipboard(this.props.url, {});
  };

  render() {
    let isDisabled = !this.props.url;

    const IOSHeader = (
      <ContentGroupHeader
        isDeviceActive={this.props.isActiveDeviceIOS}
        isSimulatorSupported={this.props.processInfo.isIosSimulatorSupported}
        onSimulatorClick={this.props.onSimulatorClickIOS}
        onDeviceClick={this.props.onDeviceClickIOS}
        isDisabled={isDisabled}>
        iOS
      </ContentGroupHeader>
    );

    const AndroidHeader = (
      <ContentGroupHeader
        isDeviceActive={this.props.isActiveDeviceAndroid}
        isSimulatorSupported={this.props.processInfo.isAndroidSimulatorSupported}
        onSimulatorClick={this.props.onSimulatorClickAndroid}
        onDeviceClick={this.props.onDeviceClickAndroid}
        isDisabled={isDisabled}>
        Android
      </ContentGroupHeader>
    );

    return (
      <div>
        <div className={STYLES_URL_SECTION}>
          <SettingsControl
            onClick={this.props.onToggleProductionMode}
            isActive={this.props.isProduction}>
            Production Mode
          </SettingsControl>

          <div className={STYLES_CONNECTION_SECTION}>
            <span className={STYLES_CONNECTION_SECTION_LEFT}>
              <div className={STYLES_SUBTITLE} style={{ marginBottom: 0 }}>
                Connection
              </div>
            </span>
            <span className={STYLES_CONNECTION_SECTION_RIGHT}>
              <NetworkGroupButton
                activeState={this.props.hostType}
                isOnline={this.props.isOnline}
                onHostTypeClick={this.props.onHostTypeClick}
                onUpdateState={this.props.onUpdateState}
                loading={this.props.hostTypeLoading}
              />
            </span>
          </div>

          <div className={STYLES_URL_SECTION_BOTTOM}>
            <div className={STYLES_URL_SECTION_BOTTOM_LEFT} onClick={this._handleCopyLink}>
              <SVG.Link size="12px" />
            </div>
            <div className={STYLES_URL_SECTION_BOTTOM_RIGHT} onClick={this._handleCopyLink}>
              {!isDisabled && !this.props.hostTypeLoading ? this.props.url : '—'}
            </div>
          </div>
        </div>

        <ContentGroup header={IOSHeader} isActive={this.props.isActiveDeviceIOS}>
          <div className={STYLES_SUBTITLE}>Send link to load</div>
          <InputWithButton
            placeholder="Enter email or number"
            value={this.props.recipient}
            onChange={this.props.onRecipientChange}
            onValidation={this.props.onEmailOrNumberValidation}
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
            onValidation={this.props.onEmailOrNumberValidation}
            onSubmit={this.props.onSubmitPhoneNumberOrEmail}>
            Send
          </InputWithButton>
        </ContentGroup>

        {this.props.isOnline ? (
          <div className={STYLES_CONTENT_GROUP} onClick={this._handleShowPublishView}>
            <span className={STYLES_CONTENT_GROUP_LEFT}>Publish {this.props.title} to Expo.io</span>
            <span className={STYLES_CONTENT_GROUP_RIGHT}>
              <SVG.Arrow size="16px" />
            </span>
          </div>
        ) : null}
      </div>
    );
  }
}
