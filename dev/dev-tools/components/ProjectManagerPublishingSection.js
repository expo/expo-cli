import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as Strings from 'app/common/strings';
import * as SVG from 'app/common/svg';

import UnstyledTextArea from 'react-textarea-autosize';

const STYLES_HEADING_WITH_DISMISS = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const STYLES_HEADING_WITH_DISMISS_LEFT = css`
  min-width: 25%;
  width: 100%;
`;

const STYLES_HEADING_WITH_DISMISS_RIGHT = css`
  flex-shrink: 0;
  cursor: pointer;
`;

const STYLES_PUBLISHING_SECTION = css`
  font-family: ${Constants.fontFamilies.regular};
  color: #ececec;
  background: #111111;
  height: 100%;
  overflow-y: scroll;
  width: 100%;
  padding: 16px 16px 48px 16px;

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${Constants.colors.foregroundAccent};
  }
`;

const STYLES_HEADING = css`
  font-family: ${Constants.fontFamilies.demi};
  overflow-wrap: break-word;
  font-weight: 400;
  font-size: 16px;
  line-height: 1.25;
  padding-bottom: 16px;
  border-bottom: #333333 1px solid;
  margin-bottom: 16px;
`;

const STYLES_PARAGRAPH = css`
  font-family: ${Constants.fontFamilies.regular};
  overflow-wrap: break-word;
  font-size: 14px;
  line-height: 1.5;
  width: 100%;
  max-width: 640px;
`;

const STYLES_SMALL_PARAGRAPH = css`
  font-family: ${Constants.fontFamilies.regular};
  font-size: 12px;
  line-height: 1.5;
  width: 100%;
  max-width: 640px;
`;

const STYLES_SUBTITLE = css`
  display: block;
  font-family: ${Constants.fontFamilies.mono};
  color: ${Constants.colors.darkBorder};
  font-size: 10px;
  text-transform: uppercase;
  margin-top: 24px;
  margin-bottom: 12px;
`;

const STYLES_INPUT = css`
  overflow-wrap: break-word;
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  box-sizing: border-box;
  display: block;
  width: 100%;
  max-width: 640px;
  padding: 8px 8px 8px 8px;
  border-radius: 4px;
  background: #333333;
  color: #acacac;
  resize: none;
  font-family: ${Constants.fontFamilies.regular};
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 24px;
`;

const STYLES_LARGE_BUTTON = css`
  font-family: ${Constants.fontFamilies.demi};
  border-radius: 4px;
  padding: 12px 16px 10px 16px;
  font-size: 16px;
  color: ${Constants.colors.white};
  background: ${Constants.colors.primary};
  line-height: 1;
  transtion: 200ms ease all;
  cursor: pointer;

  :hover {
    background: ${Constants.colors.primaryAccent};
  }
`;

const STYLES_EMPHASIS = css`
  color: ${Constants.colors.green};
`;

const STYLES_ACTIONS = css`
  margin-top: 48px;
`;

// TODO(jim): Controls for privacy.
export default class ProjectManagerPublishingSection extends React.Component {
  _handleChange = e => {
    this.props.onUpdateState({
      [e.target.name]: e.target.value,
    });
  };

  _handleDismissPublishView = () => {
    this.props.onUpdateState({
      isPublishing: false,
    });
  };

  render() {
    return (
      <div className={STYLES_PUBLISHING_SECTION}>
        <h2 className={`${STYLES_HEADING} ${STYLES_HEADING_WITH_DISMISS}`}>
          <span className={STYLES_HEADING_WITH_DISMISS_LEFT}>
            Publish your project to the internet
          </span>
          <SVG.Dismiss
            className={STYLES_HEADING_WITH_DISMISS_RIGHT}
            onClick={this._handleDismissPublishView}
            size="24px"
          />
        </h2>

        <p className={STYLES_PARAGRAPH}>
          By publishing your project, users with an Android phone will be able to access your
          project from our website. Users will also be able to leave comments on your project page.
        </p>

        <label className={STYLES_SUBTITLE}>Project name</label>
        <input
          className={STYLES_INPUT}
          value={this.props.title}
          onChange={this._handleChange}
          name="title"
        />

        <label className={STYLES_SUBTITLE}>Project URL slug</label>
        <input
          className={STYLES_INPUT}
          value={this.props.slug}
          onChange={this._handleChange}
          name="slug"
        />

        <p className={STYLES_SMALL_PARAGRAPH}>
          Your project slug will be saved as &nbsp;
          <span className={STYLES_EMPHASIS}>{Strings.createSlug(this.props.slug)}</span>&nbsp; in
          your <span className={STYLES_EMPHASIS}>App.json</span> file.
        </p>

        <label className={STYLES_SUBTITLE}>Project description</label>
        <UnstyledTextArea
          className={STYLES_INPUT}
          minRows={3}
          value={this.props.description}
          onChange={this._handleChange}
          name="description"
        />

        <h2 className={STYLES_HEADING}>Confirm changes</h2>
        <p className={STYLES_PARAGRAPH}>
          Once you publish your project, you will be able to view it at&nbsp;
          <span className={STYLES_EMPHASIS}>
            https://expo.io/@username/{Strings.createSlug(this.props.title)}.
          </span>
        </p>
        <div className={STYLES_ACTIONS}>
          <span className={STYLES_LARGE_BUTTON} onClick={this.props.onPublish}>
            Publish {Strings.createSlug(this.props.title)}
          </span>
        </div>
      </div>
    );
  }
}
