import * as Constants from 'app/common/constants';
import * as Validations from 'app/common/validations';
import ProjectManagerDeviceTab from 'app/components/ProjectManagerDeviceTab';
import ProjectManagerLayout from 'app/components/ProjectManagerLayout';
import ProjectManagerPublishingSection from 'app/components/ProjectManagerPublishingSection';
import ProjectManagerSidebarOptions from 'app/components/ProjectManagerSidebarOptions';
import ProjectManagerToolbar from 'app/components/ProjectManagerToolbar';
import UserIndicator from 'app/components/UserIndicator';
import * as React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { css } from 'react-emotion';

const wait = delay =>
  new Promise(resolve => {
    window.setTimeout(resolve, delay);
  });

const OVERLAY_Z_INDEX = 10;

const STYLES_HEADER = css`
  background: ${Constants.colors.yellow};
  font-family: sans-serif;
  font-weight: 600;
  font-size: 12px;
  line-height: 18px;
  padding: 8px 16px 8px 16px;
  width: 100%;
  z-index: ${OVERLAY_Z_INDEX + 1};
`;

const STYLES_OVERLAY = css`
  background: rgba(1, 1, 1, 0.75);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${OVERLAY_Z_INDEX};
`;

const STYLES_COMMAND = css`
  font-family: ${Constants.fontFamilies.mono};
  color: ${Constants.colors.white};
  background: #a88400;
  display: inline-block;
  vertical-align: top;
  padding: 4px 4px 4px 4px;
  line-height: 10px;
  border-radius: 2px;
  font-size: 10px;
`;

class DisconnectedHeader extends React.Component {
  render() {
    return (
      <React.Fragment>
        <div className={STYLES_HEADER} key="header">
          Expo Developer Tools is disconnected from Expo CLI. Use the{' '}
          <code className={STYLES_COMMAND}>expo start</code> command to start the CLI again.
        </div>
        <div className={STYLES_OVERLAY} key="overlay" />
      </React.Fragment>
    );
  }
}

class ProjectManager extends React.Component {
  static defaultProps = {
    project: { settings: {}, config: {} },
  };

  state = {
    hostTypeLoading: false,
  };

  _handleDeviceClickIOS = () => {
    this.props.onUpdateState({
      isActiveDeviceIOS: !this.props.isActiveDeviceIOS,
      isActiveDeviceAndroid: false,
      isPublishing: false,
    });
  };

  _handleDeviceClickAndroid = () => {
    this.props.onUpdateState({
      isActiveDeviceIOS: false,
      isActiveDeviceAndroid: !this.props.isActiveDeviceAndroid,
      isPublishing: false,
    });
  };

  _handleRecipientChange = e => {
    this.props.onUpdateState({
      recipient: e.target.value,
      isPublishing: false,
    });
  };

  _handleEmailOrPhoneNumberValidation = async recipient => {
    const isPhoneNumber = Validations.isPhoneNumber(recipient);
    const isEmail = Validations.isEmail(recipient);

    if (isPhoneNumber || isEmail) {
      return true;
    }

    this.props.dispatch({
      type: 'ADD_TOAST',
      toast: {
        id: 'send-email-or-number',
        name: 'error',
        text: `Please provide a valid email address.`,
      },
    });

    return false;
  };

  _handleHostTypeClick = async type => {
    this.setState({ hostTypeLoading: true });
    try {
      await Promise.all([
        this.props.onHostTypeClick(type),
        // Delay hiding the loading indicator to avoid flashing.
        wait(500),
      ]);
    } finally {
      this.setState({ hostTypeLoading: false });
    }
  };

  render() {
    if (this.props.loading) {
      return null;
    }

    if (this.props.error) {
      return null;
    }

    const toolbarElements = (
      <ProjectManagerToolbar
        title={this.props.project.config.name}
        onUpdateState={this.props.onUpdateState}
        onChangeSectionCount={this.props.onChangeSectionCount}
        isPublishing={this.props.isPublishing}
        count={this.props.sections.length}
        renderableCount={this.props.renderableSections.length}
      />
    );

    const devicesElements = (
      <div>
        {this.props.sections.map(source => {
          return (
            <ProjectManagerDeviceTab
              onClick={() => this.props.onDeviceSelect(source)}
              onUpdateState={this.props.onUpdateState}
              key={source.id}
              source={source}
            />
          );
        })}
      </div>
    );

    const platforms = this.props.project.config.platforms || ['ios', 'android', 'web'];

    const isIosDisabled = !platforms.includes('ios');
    const isAndroidDisabled = !platforms.includes('android');
    const isWebDisabled = !platforms.includes('web');

    const viewingElements = (
      <ProjectManagerSidebarOptions
        url={this.props.project.manifestUrl}
        hostType={this.props.project.settings.hostType}
        hostTypeLoading={this.state.hostTypeLoading}
        recipient={this.props.recipient}
        title={this.props.project.config.name}
        processInfo={this.props.processInfo}
        onUpdateState={this.props.onUpdateState}
        onRecipientChange={this._handleRecipientChange}
        onSimulatorClickIOS={this.props.onSimulatorClickIOS}
        onStartWebClick={this.props.onStartWebClick}
        onSimulatorClickAndroid={this.props.onSimulatorClickAndroid}
        onDeviceClickIOS={this._handleDeviceClickIOS}
        onDeviceClickAndroid={this._handleDeviceClickAndroid}
        onHostTypeClick={this._handleHostTypeClick}
        onSubmitPhoneNumberOrEmail={this.props.onSubmitPhoneNumberOrEmail}
        onEmailOrNumberValidation={this._handleEmailOrPhoneNumberValidation}
        onToggleProductionMode={this.props.onToggleProductionMode}
        user={this.props.user}
        isIosDisabled={isIosDisabled}
        isAndroidDisabled={isAndroidDisabled}
        isWebDisabled={isWebDisabled}
        isProduction={!this.props.project.settings.dev}
        isPublishing={this.props.isPublishing}
        isActiveDeviceIOS={this.props.isActiveDeviceIOS}
        isActiveDeviceAndroid={this.props.isActiveDeviceAndroid}
      />
    );

    const userElement = <UserIndicator user={this.props.user} />;

    const publishingElement = (
      <ProjectManagerPublishingSection
        config={this.props.project.config}
        user={this.props.user}
        onPublish={this.props.onPublishProject}
        onUpdateState={this.props.onUpdateState}
      />
    );

    return (
      <ProjectManagerLayout
        alertSection={this.props.disconnected ? <DisconnectedHeader /> : null}
        navigationSection={null}
        headerSection={userElement}
        devicesSection={devicesElements}
        toolbarSection={toolbarElements}
        viewingSection={viewingElements}
        publishingSection={this.props.isPublishing ? publishingElement : null}
        sections={this.props.renderableSections}
        selectedId={this.props.selectedId}
        onSectionDrag={this.props.onSectionDrag}
        onSectionDismiss={this.props.onSectionDismiss}
        onSectionSelect={this.props.onSectionSelect}
        onClearMessages={this.props.onClearMessages}
      />
    );
  }
}

export default DragDropContext(HTML5Backend)(ProjectManager);
