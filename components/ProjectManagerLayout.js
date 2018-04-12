import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

import ProjectManagerSection from 'app/components/ProjectManagerSection';

const STYLES_MAIN_SECTION = css`
  background: ${Constants.colors.appBackground};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  height: 100%;
`;

const STYLES_CONTAINER = css`
  background: ${Constants.colors.white};
  display: flex;
  height: 100%;
  min-height: 25%;
  width: 100%;
  position: relative;
`;

const STYLES_CONTAINER_LEFT = css`
  border-right: 1px solid ${Constants.colors.border};
  background: ${Constants.colors.sidebarBackground};
  width: 300px;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
`;

const STYLES_CONTAINER_LEFT_TOP = css`
  min-height: 25%;
  height: 100%;
  width: 100%;
`;

const STYLES_CONTAINER_LEFT_BOTTOM = css`
  border-top: 1px solid ${Constants.colors.border};
  background: ${Constants.colors.white};
  flex-shrink: 0;
  width: 100%;
`;

const STYLES_CONTAINER_MIDDLE = css`
  background: ${Constants.colors.foreground};
  width: 100%;
  height: 100%;
  min-width: 25%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
`;

const STYLES_CONTAINER_MIDDLE_TOP = css`
  background: ${Constants.colors.foreground};
  flex-shrink: 0;
  height: 48px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const STYLES_CONTAINER_MIDDLE_TOP_ACTIONS = css`
  flex-shrink: 0;
  padding: 0 16px 0 16px;
`;

const STYLES_CONTAINER_MIDDLE_TOP_HEADER = css`
  min-width: 25%;
  width: 100%;
  padding: 0 0 0 16px;
`;

const STYLES_CONTAINER_MIDDLE_BOTTOM = css`
  min-height: 25%;
  height: 100%;
  width: 100%;
  position: relative;
`;

const STYLES_ROW_STACK = css`
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;
`;

const STYLES_ROW_FULL = css`
  min-height: 25%;
  height: 100%;
  width: 100%;
  display: flex;
  aling-items: flex-start;
  justify-content: space-between;
  position: relative;
`;

const STYLES_ROW_HALF = css`
  min-height: 25%;
  height: 50%;
  width: 100%;
  display: flex;
  aling-items: flex-start;
  justify-content: space-between;
  position: relative;

  :last-child {
    border-bottom: 0px;
  }
`;

const STYLES_COL = css`
  width: 50%;
  height: 100%;
  overflow: hidden;
  position: relative;

  :last-child {
    border-right: 0px;
  }
`;

const STYLES_COL_THIRD = css`
  width: 33.33%;
  height: 100%;
  overflow: hidden;
  position: relative;

  :last-child {
    border-right: 0px;
  }
`;

export default class ProjectManagerLayout extends React.Component {
  _renderSection = section => {
    return (
      <ProjectManagerSection
        onSectionDrag={this.props.onSectionDrag}
        onSectionSelect={() => this.props.onSectionSelect({ id: section.id })}
        onSectionDismiss={this.props.onSectionDismiss}
        isSelected={this.props.selectedId === section.id}
        data={section}
      />
    );
  };

  _renderSectionElements = sections => {
    if (sections.length === 1) {
      return (
        <div className={STYLES_CONTAINER_MIDDLE_BOTTOM}>{this._renderSection(sections[0])}</div>
      );
    }

    if (sections.length === 2) {
      return (
        <div className={STYLES_ROW_FULL}>
          <div className={STYLES_COL}>{this._renderSection(sections[0])}</div>
          <div className={STYLES_COL}>{this._renderSection(sections[1])}</div>
        </div>
      );
    }

    if (sections.length === 3) {
      return (
        <div className={STYLES_ROW_FULL}>
          <div className={STYLES_COL_THIRD}>{this._renderSection(sections[0])}</div>
          <div className={STYLES_COL_THIRD}>{this._renderSection(sections[1])}</div>
          <div className={STYLES_COL_THIRD}>{this._renderSection(sections[2])}</div>
        </div>
      );
    }

    if (sections.length === 4) {
      return (
        <div className={STYLES_ROW_STACK}>
          <div className={STYLES_ROW_HALF}>
            <div className={STYLES_COL}>{this._renderSection(sections[0])}</div>
            <div className={STYLES_COL}>{this._renderSection(sections[1])}</div>
          </div>
          <div className={STYLES_ROW_HALF}>
            <div className={STYLES_COL}>{this._renderSection(sections[2])}</div>
            <div className={STYLES_COL}>{this._renderSection(sections[3])}</div>
          </div>
        </div>
      );
    }
  };

  render() {
    const {
      navigationSection,
      devicesSection,
      viewingSection,
      headerSection,
      toolbarSection,
      alertSection,
      sections,
    } = this.props;
    const sectionElements = this._renderSectionElements(sections);

    return (
      <section className={STYLES_MAIN_SECTION}>
        {navigationSection}
        {alertSection}
        <div className={STYLES_CONTAINER}>
          <div className={STYLES_CONTAINER_LEFT}>
            <div className={STYLES_CONTAINER_LEFT_TOP}>{devicesSection}</div>
            <div className={STYLES_CONTAINER_LEFT_BOTTOM}>{viewingSection}</div>
          </div>
          <div className={STYLES_CONTAINER_MIDDLE}>
            <div className={STYLES_CONTAINER_MIDDLE_TOP}>
              <div className={STYLES_CONTAINER_MIDDLE_TOP_HEADER}>{headerSection}</div>
              <div className={STYLES_CONTAINER_MIDDLE_TOP_ACTIONS}>{toolbarSection}</div>
            </div>
            {sectionElements}
          </div>
        </div>
      </section>
    );
  }
}
