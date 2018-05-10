import styled, { css } from 'react-emotion';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import * as React from 'react';
import * as Constants from 'app/common/constants';

import ProjectManagerLayout from 'app/components/ProjectManagerLayout';
import ProjectManagerDeviceTab from 'app/components/ProjectManagerDeviceTab';
import ProjectManagerSidebarOptions from 'app/components/ProjectManagerSidebarOptions';
import ProjectManagerToolbar from 'app/components/ProjectManagerToolbar';
import ProjectManagerPublishingSection from 'app/components/ProjectManagerPublishingSection';
import NetworkIndicator from 'app/components/NetworkIndicator';

// TODO(jim): I'm not really sure about the offline header right now.
const STYLES_HEADER = css`
  background: ${Constants.colors.yellow};
  font-family: ${Constants.fontFamilies.bold};
  font-size: 12px;
  padding: 8px 16px 8px 16px;
  width: 100%;
`;

class ProjectManager extends React.Component {
  static defaultProps = {
    project: { settings: {}, config: {} },
  };

  _handleDeviceClickIOS = () => {
    this.props.onUpdateState({
      isActiveDeviceIOS: !this.props.isActiveDeviceIOS,
      isActiveDeviceAndroid: false,
    });
  };

  _handleDeviceClickAndroid = () => {
    this.props.onUpdateState({
      isActiveDeviceIOS: false,
      isActiveDeviceAndroid: !this.props.isActiveDeviceAndroid,
    });
  };

  _handleRecipientChange = e => {
    this.props.onUpdateState({
      recipient: e.target.value,
    });
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
              data={source}
            />
          );
        })}
      </div>
    );

    const viewingElements = (
      <ProjectManagerSidebarOptions
        url={this.props.project.manifestUrl}
        hostType={this.props.project.settings.hostType}
        recipient={this.props.recipient}
        title={this.props.project.config.name}
        onUpdateState={this.props.onUpdateState}
        onRecipientChange={this._handleRecipientChange}
        onSimulatorClickIOS={this.props.onSimulatorClickIOS}
        onSimulatorClickAndroid={this.props.onSimulatorClickAndroid}
        onDeviceClickIOS={this._handleDeviceClickIOS}
        onDeviceClickAndroid={this._handleDeviceClickAndroid}
        onHostTypeClick={this.props.onHostTypeClick}
        onSubmitPhoneNumberOrEmail={this.props.onSubmitPhoneNumberOrEmail}
        isPublishing={this.props.isPublishing}
        isActiveDeviceIOS={this.props.isActiveDeviceIOS}
        isActiveDeviceAndroid={this.props.isActiveDeviceAndroid}
      />
    );

    const offlineElement = (
      <NetworkIndicator networkStatus={this.props.processInfo.networkStatus} />
    );

    const publishingElement = (
      <ProjectManagerPublishingSection
        config={this.props.project.config}
        onPublish={this.props.onPublishProject}
        onUpdateState={this.props.onUpdateState}
      />
    );

    return (
      <ProjectManagerLayout
        alertSection={null}
        navigationSection={null}
        headerSection={offlineElement}
        devicesSection={devicesElements}
        toolbarSection={toolbarElements}
        viewingSection={viewingElements}
        publishingSection={this.props.isPublishing ? publishingElement : null}
        sections={this.props.renderableSections}
        selectedId={this.props.selectedId}
        onSectionDrag={this.props.onSectionDrag}
        onSectionDismiss={this.props.onSectionDismiss}
        onSectionSelect={this.props.onSectionSelect}
      />
    );
  }
}

export default DragDropContext(HTML5Backend)(ProjectManager);
