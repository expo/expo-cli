import * as React from 'react';
import gql from 'graphql-tag';
import { Query } from 'react-apollo';

import * as Constants from 'app/common/constants';
import * as Strings from 'app/common/strings';
import * as Data from 'app/common/data';
import * as State from 'app/common/state';
import { initStore } from 'app/common/store';

import withRedux from 'app/higher-order/withRedux';
import withApollo from 'app/higher-order/withApollo';

import Root from 'app/components/Root';
import ProjectManager from 'app/components/ProjectManager';

let query = gql`
  query IndexPageQuery {
    currentProject {
      manifestUrl
      settings {
        hostType
      }
      config {
        name
        description
        slug
      }
    }
    userSettings {
      sendTo
    }
  }
`;

@withApollo
@withRedux(initStore, state => state)
export default class IndexPage extends React.Component {
  static getInitialProps({ store, isServer }) {
    // NOTE(jim): Server side state update example.
    // TODO(jim): We can kill this once we integrate.
    Data.generateServerSideMockData(store);

    return { isServer };
  }

  async componentDidMount() {
    // NOTE(jim): Clientside state update example.
    // TODO(jim): We can kill this once we integrate.
    Data.generateClientSideMockData(this.props);
  }

  _handleDeviceSelect = options => State.deviceSelect(options, this.props);
  _handleSectionDrag = options => State.deviceSwap(options, this.props);
  _handleSectionSelect = options => State.sectionSelect(options, this.props);
  _handleSectionDismiss = () => State.sectionClear(this.props);
  _handleChangeSectionCount = count => State.sectionCount({ count }, this.props);
  _handleUpdateState = options => State.update(options, this.props);
  _handleSimulatorClickIOS = () => State.openSimulator('ios', this.props);
  _handleSimulatorClickAndroid = () => State.openSimulator('android', this.props);
  _handleHostTypeClick = hostType => State.setProjectSettings({ hostType }, this.props);
  _handleSubmitPhoneNumberOrEmail = () => State.sendProjectUrl(this.props.recipient, this.props);
  _handlePublishProject = () => State.publishProject(this.props);

  render() {
    return (
      <Query query={query}>
        {result => {
          const { currentProject, loading, error } = result.data;

          return (
            <Root>
              <ProjectManager
                loading={loading}
                error={error}
                project={currentProject}
                renderableSections={this.props.devices.slice(0, this.props.count)}
                sections={this.props.devices}
                count={this.props.count}
                userAddress={this.props.userAddress}
                selectedId={this.props.selectedId}
                isPublishing={this.props.isPublishing}
                isActiveDeviceAndroid={this.props.isActiveDeviceAndroid}
                isActiveDeviceIOS={this.props.isActiveDeviceIOS}
                onPublishProject={this._handlePublishProject}
                onHostTypeClick={this._handleHostTypeClick}
                onSimulatorClickIOS={this._handleSimulatorClickIOS}
                onSimulatorClickAndroid={this._handleSimulatorClickAndroid}
                onSectionDrag={this._handleSectionDrag}
                onSectionDismiss={this._handleSectionDismiss}
                onSectionSelect={this._handleSectionSelect}
                onSubmitPhoneNumberOrEmail={this._handleSubmitPhoneNumberOrEmail}
                onChangeSectionCount={this._handleChangeSectionCount}
                onDeviceSelect={this._handleDeviceSelect}
                onUpdateState={this._handleUpdateState}
              />
            </Root>
          );
        }}
      </Query>
    );
  }
}
