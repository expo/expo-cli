import * as Constants from 'app/common/constants';
import * as Strings from 'app/common/strings';
import * as SVG from 'app/common/svg';
import InputWithLabel from 'app/components/InputWithLabel';
import PrimaryButtonWithStates from 'app/components/PrimaryButtonWithStates';
import SettingsControl from 'app/components/SettingsControl';
import TextareaWithLabel from 'app/components/TextareaWithLabel';
import * as React from 'react';
import { css } from 'react-emotion';

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
  background: ${Constants.colors.black};
  color: ${Constants.colors.border};
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
  border-bottom: ${Constants.colors.foregroundAccent} 1px solid;
  overflow-wrap: break-word;
  font-weight: 400;
  font-size: 16px;
  line-height: 1.25;
  padding-bottom: 16px;
  margin-bottom: 16px;
`;

const STYLES_PARAGRAPH = css`
  font-family: ${Constants.fontFamilies.regular};
  max-width: ${Constants.breakpoints.medium}px;
  overflow-wrap: break-word;
  font-size: 14px;
  line-height: 1.5;
  width: 100%;
`;

const STYLES_EMPHASIS = css`
  color: ${Constants.colors.green};
`;

const STYLES_ACTIONS = css`
  margin-top: 48px;
`;

const STYLES_CANCEL = css`
  font-family: ${Constants.fontFamilies.demi};
  color: ${Constants.colors.border};
  font-size: 16px;
  margin-left: 24px;
  cursor: pointer;
`;

const STYLES_TOGGLE = css`
  max-width: ${Constants.breakpoints.smallSidebar}px;
  margin-bottom: 24px;
`;

const STYLES_SETTINGS_CONTROL = css`
  font-family: ${Constants.fontFamilies.mono};
  color: ${Constants.colors.darkBorder};
  font-size: 10px;
`;

// TODO(jim): Controls for privacy.
export default class ProjectManagerPublishingSection extends React.Component {
  state = {
    isPublishing: false,
    optimize: true,
    config: getConfigFromProps(this.props),
    errors: {},
  };

  _handleChangeName = e => {
    const value = e.target.value;
    this.setState(state => {
      const oldSlug = Strings.slugify(state.config.name);
      let slug = state.config.slug;
      if (state.config.slug === oldSlug) {
        slug = Strings.slugify(value);
      }
      return {
        config: {
          ...state.config,
          name: value,
          slug,
        },
        errors: {
          ...state.errors,
          name: Strings.isEmptyOrNull(value) ? 'Must be not blank' : null,
          slug: Strings.isEmptyOrNull(slug) ? 'Must be not blank' : null,
        },
      };
    });
  };

  _handleChangeSlug = e => {
    const value = e.target.value;
    this.setState(state => {
      const slug = Strings.slugify(value);
      return {
        config: {
          ...state.config,
          slug,
        },
        errors: {
          ...state.errors,
          slug: Strings.isEmptyOrNull(slug) ? 'Must be not blank' : null,
        },
      };
    });
  };

  _handleChangeGithubUrl = e => {
    const value = e.target.value;
    this.setState(state => {
      return {
        config: {
          ...state.config,
          githubUrl: value,
        },
        errors: {
          ...state.errors,
          githubUrl:
            !Strings.isEmptyOrNull(value) && !value.match(/^https:\/\/github.com\//)
              ? 'Must be in format "https://github.com/"'
              : null,
        },
      };
    });
  };

  _handleChangeDescription = e => {
    const value = e.target.value;
    this.setState(state => {
      return {
        config: {
          ...state.config,
          description: value,
        },
      };
    });
  };

  _handleDismissPublishView = () => {
    this.setState((state, props) => ({
      config: getConfigFromProps(props),
    }));
    this.props.onUpdateState({
      isPublishing: false,
    });
  };

  _handleOptimizeToggle = () => {
    this.setState(state => ({
      optimize: !state.optimize,
    }));
  };

  _handleCancel = () => {
    this.props.onUpdateState({
      isPublishing: false,
    });
  };

  _handlePublish = async () => {
    this.setState({
      isPublishing: true,
    });
    await this.props.onPublish({
      config: this.state.config,
      optimize: this.state.optimize,
    });
  };

  hasErrors() {
    return Object.keys(this.state.errors).some(key => this.state.errors[key]);
  }

  _getCurrentPublishButtonState = () => {
    if (this.state.isPublishing) {
      return 'PUBLISHING';
    }

    if (this.hasErrors()) {
      return 'ERRORS';
    }

    return 'IDLE';
  };

  render() {
    return (
      <div className={STYLES_PUBLISHING_SECTION}>
        <h2 className={`${STYLES_HEADING} ${STYLES_HEADING_WITH_DISMISS}`}>
          <span className={STYLES_HEADING_WITH_DISMISS_LEFT}>
            Publish or republish your project to the internet
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

        <InputWithLabel
          style={{ margin: '24px 0 24px 0' }}
          label="Name"
          name="name"
          value={this.state.config.name}
          errorValue={this.state.errors.name}
          onChange={this._handleChangeName}
        />

        <InputWithLabel
          style={{ margin: '0 0 24px 0' }}
          label="URL slug"
          name="slug"
          value={this.state.config.slug}
          errorValue={this.state.errors.slug}
          onChange={this._handleChangeSlug}
        />

        <InputWithLabel
          style={{ margin: '0 0 24px 0' }}
          label="Github Source URL (optional)"
          name="githubUrl"
          value={this.state.config.githubUrl}
          errorValue={this.state.errors.githubUrl}
          onChange={this._handleChangeGithubUrl}
        />

        <TextareaWithLabel
          style={{ margin: '0 0 24px 0' }}
          label="Description (optional)"
          name="description"
          minRows={3}
          value={this.state.config.description}
          errorValue={this.state.errors.description}
          onChange={this._handleChangeDescription}
        />

        <div className={STYLES_TOGGLE}>
          <SettingsControl onClick={this._handleOptimizeToggle} isActive={this.state.optimize}>
            <span className={STYLES_SETTINGS_CONTROL}>Optimize Assets</span>
          </SettingsControl>
        </div>

        <h2 className={STYLES_HEADING}>Confirm changes</h2>

        <p className={STYLES_PARAGRAPH}>
          Once you publish your project, you will be able to view it at&nbsp;
          <span className={STYLES_EMPHASIS}>
            https://expo.dev/@{this.props.user.username}/projects/{this.state.config.slug}
          </span>
          .
        </p>
        <div className={STYLES_ACTIONS}>
          <PrimaryButtonWithStates
            states={{
              IDLE: { text: 'Publish project', decoration: 'DEFAULT' },
              ERRORS: { text: 'You must fix errors before publishing', decoration: 'ERROR' },
              PUBLISHING: { text: 'Publishing...', decoration: 'LOADING' },
            }}
            currentState={this._getCurrentPublishButtonState()}
            onClick={this._handlePublish}
          />

          <span className={STYLES_CANCEL} onClick={this._handleCancel}>
            Cancel
          </span>
        </div>
      </div>
    );
  }
}

function getConfigFromProps(props) {
  return {
    name: props.config.name || '',
    slug: props.config.slug || '',
    githubUrl: props.config.githubUrl || '',
    description: props.config.description || '',
  };
}
