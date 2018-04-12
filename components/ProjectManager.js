import styled, { css } from 'react-emotion';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as Sets from 'app/common/sets';

import ProjectManagerLayout from 'app/components/ProjectManagerLayout';
import ProjectManagerDeviceTab from 'app/components/ProjectManagerDeviceTab';
import ProjectManagerSidebarOptions from 'app/components/ProjectManagerSidebarOptions';
import ProjectManagerToolbar from 'app/components/ProjectManagerToolbar';

const STYLES_HEADER = css`
  background: ${Constants.colors.yellow};
  font-family: ${Constants.fontFamilies.bold};
  font-size: 12px;
  padding: 8px 16px 8px 16px;
  width: 100%;
`;

class ProjectManager extends React.Component {
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

  render() {
    const toolbarElements = (
      <ProjectManagerToolbar
        onChangeSelectionCount={this.props.onChangeSelectionCount}
        count={this.props.sections.length}
        renderableCount={this.props.renderableSections.length}
      />
    );

    const devicesElements = (
      <div>
        {Sets.alphabetize(this.props.sections).map(l => {
          return (
            <ProjectManagerDeviceTab
              onClick={() => this.props.onDeviceSelect({ id: l.id })}
              key={`devices-${l.name}`}
              data={l}
            />
          );
        })}
      </div>
    );

    const viewingElements = (
      <ProjectManagerSidebarOptions
        url={this.props.url}
        onSimulatorClickIOS={this.props.onSimulatorClickIOS}
        onDeviceClickIOS={this._handleDeviceClickIOS}
        isActiveDeviceIOS={this.props.isActiveDeviceIOS}
        onSimulatorClickAndroid={this.props.onSimulatorClickAndroid}
        onDeviceClickAndroid={this._handleDeviceClickAndroid}
        isActiveDeviceAndroid={this.props.isActiveDeviceAndroid}
      />
    );

    const alertElement = (
      <div className={STYLES_HEADER}>
        You are using Expo Developer Tools in offline mode. Connecting to the internet will enable
        more features and allow you to publish your project to expo.io
      </div>
    );

    return (
      <ProjectManagerLayout
        alertSection={alertElement}
        navigationSection={null}
        headerSection={null}
        devicesSection={devicesElements}
        toolbarSection={toolbarElements}
        viewingSection={viewingElements}
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
