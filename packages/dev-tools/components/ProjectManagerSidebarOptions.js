import * as Constants from 'app/common/constants';
import * as SVG from 'app/common/svg';
import ContentGroup from 'app/components/ContentGroup';
import InputWithButton from 'app/components/InputWithButton';
import NetworkGroupButton from 'app/components/NetworkGroupButton';
import QRCode from 'app/components/QRCode';
import SettingsControl from 'app/components/SettingsControl';
import copyToClipboard from 'copy-to-clipboard';
import * as React from 'react';
import { css } from 'react-emotion';

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
`;

const STYLES_URL_SECTION_BOTTOM = css`
  font-family: ${Constants.fontFamilies.regular};
  font-size: 12px;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
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

const STYLES_QR_SECTION = css`
  padding-top: 16px;
`;

const STYLES_SUBTITLE = css`
  font-family: ${Constants.fontFamilies.mono};
  color: #555555;
  font-size: 10px;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const STYLES_CONTENT_GROUP = css`
  color: currentColor;
  text-decoration: none;
  border-bottom: 1px solid ${Constants.colors.border};
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
  state = { isSendFormVisible: false, showCopiedMessage: false };

  _handleShowPublishView = () => {
    this.props.onUpdateState({
      isPublishing: !this.props.isPublishing,
      isActiveDeviceIOS: false,
      isActiveDeviceAndroid: false,
    });
  };

  _handleCopyLink = () => {
    copyToClipboard(this.props.url, {});
    this.setState({ showCopiedMessage: true });
    setTimeout(() => {
      this.setState({ showCopiedMessage: false });
    }, 2000);
  };

  _handleSendHeaderClick = () => {
    this.setState(state => ({ isSendFormVisible: !state.isSendFormVisible }));
  };

  render() {
    const { showCopiedMessage, isSendFormVisible } = this.state;
    const isDisabled = !this.props.url;
    const { platforms } = this.props.config;

    const sendHeader = (
      <div className={STYLES_CONTENT_GROUP} onClick={this._handleSendHeaderClick}>
        <span className={STYLES_CONTENT_GROUP_LEFT}>Send link with email…</span>
      </div>
    );

    return (
      <div>
        {platforms.includes('android') && (
          <div className={STYLES_CONTENT_GROUP} onClick={this.props.onSimulatorClickAndroid}>
            <span className={STYLES_CONTENT_GROUP_LEFT}>Run on Android device/emulator</span>
          </div>
        )}
        {platforms.includes('ios') && (
          <div className={STYLES_CONTENT_GROUP} onClick={this.props.onSimulatorClickIOS}>
            <span className={STYLES_CONTENT_GROUP_LEFT}>Run on iOS simulator</span>
          </div>
        )}
        {platforms.includes('web') && (
          <a className={STYLES_CONTENT_GROUP} onClick={this.props.onStartWebClick}>
            <span className={STYLES_CONTENT_GROUP_LEFT}>Run in web browser</span>
          </a>
        )}

        <ContentGroup header={sendHeader} isActive={isSendFormVisible}>
          <InputWithButton
            placeholder="Enter email address"
            value={this.props.recipient}
            onChange={this.props.onRecipientChange}
            onValidation={this.props.onEmailOrNumberValidation}
            onSubmit={this.props.onSubmitPhoneNumberOrEmail}>
            Send
          </InputWithButton>
        </ContentGroup>
        {this.props.user ? (
          <div className={STYLES_CONTENT_GROUP} onClick={this._handleShowPublishView}>
            <span className={STYLES_CONTENT_GROUP_LEFT}>Publish or republish project…</span>
            <span className={STYLES_CONTENT_GROUP_RIGHT}>
              <SVG.Arrow size="16px" />
            </span>
          </div>
        ) : null}
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
                onHostTypeClick={this.props.onHostTypeClick}
                onUpdateState={this.props.onUpdateState}
                loading={this.props.hostTypeLoading}
              />
            </span>
          </div>

          <div className={STYLES_URL_SECTION_BOTTOM} title="Click to copy to clipboard">
            <div className={STYLES_URL_SECTION_BOTTOM_LEFT} onClick={this._handleCopyLink}>
              <SVG.Link size="12px" />
            </div>
            <div className={STYLES_URL_SECTION_BOTTOM_RIGHT} onClick={this._handleCopyLink}>
              {!isDisabled && !this.props.hostTypeLoading ? this.props.url : '-'}
            </div>
            {showCopiedMessage ? <p>Copied!</p> : null}
          </div>

          <div className={STYLES_QR_SECTION}>
            <QRCode url={this.props.url} />
          </div>
        </div>
      </div>
    );
  }
}
