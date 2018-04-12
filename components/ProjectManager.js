import styled, { css } from 'react-emotion';
import { DragDropContext } from 'react-dnd';
import QRCodeReact from 'qrcode-react';
import HTML5Backend from 'react-dnd-html5-backend';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as SVG from 'app/common/svg';
import * as Strings from 'app/common/strings';
import * as Sets from 'app/common/sets';

import SmallButton from 'app/components/SmallButton';
import ProjectManagerLayout from 'app/components/ProjectManagerLayout';
import ProjectManagerDeviceTab from 'app/components/ProjectManagerDeviceTab';
import ProjectManagerViewingOption from 'app/components/ProjectManagerViewingOption';

const STYLES_HEADER = css`
  background: ${Constants.colors.yellow};
  font-family: ${Constants.fontFamilies.bold};
  font-size: 12px;
  padding: 8px 16px 8px 16px;
  width: 100%;
`;

const STYLES_LINK = css`
  color: ${Constants.colors.black};
  text-decoration: none;

  :visited: {
    color: ${Constants.colors.black};
  }
`;

const STYLES_QR_SECTION = css`
  padding: 16px;
`;

const STYLES_URL_SECTION = css`
  padding: 16px;
  border-top: 1px solid ${Constants.colors.border};
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

class ProjectManager extends React.Component {
  render() {
    const statusSectionElements = (
      <div>
        {this.props.sections.length > 1 && (
          <SmallButton
            onClick={() => this.props.onChangeSelectionCount(1)}
            isActive={this.props.renderableSections.length === 1}>
            <SVG.One size="16px" />
          </SmallButton>
        )}
        {this.props.sections.length > 1 && (
          <SmallButton
            onClick={() => this.props.onChangeSelectionCount(2)}
            isActive={this.props.renderableSections.length === 2}>
            <SVG.Columns size="16px" />
          </SmallButton>
        )}
        {this.props.sections.length > 2 && (
          <SmallButton
            onClick={() => this.props.onChangeSelectionCount(3)}
            isActive={this.props.renderableSections.length === 3}>
            <SVG.Three size="16px" />
          </SmallButton>
        )}
        {this.props.sections.length > 3 && (
          <SmallButton
            onClick={() => this.props.onChangeSelectionCount(4)}
            isActive={this.props.renderableSections.length === 4}>
            <SVG.Grid size="16px" />
          </SmallButton>
        )}
      </div>
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
      <div>
        <ProjectManagerViewingOption onClick={this.props.onOpenIOSSimulator}>
          Open with iOS Simulator
        </ProjectManagerViewingOption>
        <ProjectManagerViewingOption onClick={this.props.onOpenAndroidSimulator}>
          Open with Android Simulator
        </ProjectManagerViewingOption>
        <div className={STYLES_QR_SECTION}>
          <QRCodeReact value={`https://www.google.com`} size={212} />
        </div>
        <div className={STYLES_URL_SECTION}>
          <div className={STYLES_URL_SECTION_TOP}>Development URL</div>
          <div className={STYLES_URL_SECTION_BOTTOM}>{this.props.url}</div>
        </div>
      </div>
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
        devicesSection={devicesElements}
        statusSection={statusSectionElements}
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
