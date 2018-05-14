import * as React from 'react';
import gql from 'graphql-tag';
import { ApolloProvider, Query } from 'react-apollo';

import * as Constants from 'app/common/constants';
import * as Strings from 'app/common/strings';
import * as Data from 'app/common/data';
import * as State from 'app/common/state';
import createApolloClient from 'app/common/createApolloClient';
import { initStore } from 'app/common/store';

import withRedux from 'app/higher-order/withRedux';

import Root from 'app/components/Root';
import ProjectManager from 'app/components/ProjectManager';

const query = gql`
  query IndexPageQuery {
    currentProject {
      id
      manifestUrl
      settings {
        hostType
      }
      config {
        name
        description
        slug
        githubUrl
      }
      sources {
        __typename
        id
        name
        messages {
          count
          nodes {
            id
            __typename
            msg
            time
            level
          }
        }
      }
      messages {
        pageInfo {
          lastCursor
        }
      }
    }
    userSettings {
      id
      sendTo
    }
    projectManagerLayout {
      __typename
      id
      selected {
        id
      }
      sources {
        id
      }
    }
    processInfo {
      networkStatus
      isAndroidSimulatorSupported
      isIosSimulatorSupported
    }
  }
`;

const subscriptionQuery = gql`
  subscription MessageSubscription($after: String) {
    messages(after: $after) {
      type
      node {
        id
        __typename
        msg
        time
        level
        source {
          id
        }
      }
    }
  }
`;

const createSourceQuery = typename => gql`
  fragment ${typename}Fragment on ${typename} {
    __typename
    id
    messages {
      __typename
      count
      nodes {
        id
        __typename
        msg
        time
        level
      }
    }
  }
`;

@withRedux(initStore, state => state)
class IndexPageContents extends React.Component {
  _handleDeviceSelect = options => State.sourceSelect(options, this.props);
  _handleSectionDrag = options => State.sourceSwap(options, this.props);
  _handleSectionSelect = options => State.sectionSelect(options, this.props);
  _handleSectionDismiss = () => State.sectionClear(this.props);
  _handleChangeSectionCount = count => State.sectionCount({ count }, this.props);
  _handleUpdateState = options => State.update(options, this.props);
  _handleSimulatorClickIOS = () => State.openSimulator('IOS', this.props);
  _handleSimulatorClickAndroid = () => State.openSimulator('ANDROID', this.props);
  _handleHostTypeClick = hostType => State.setProjectSettings({ hostType }, this.props);
  _handlePublishProject = options => State.publishProject(options, this.props);
  _handleSubmitPhoneNumberOrEmail = async () =>
    await State.sendProjectUrl(this.props.recipient, this.props);

  componentDidMount() {
    const observable = this.props.client.subscribe({
      query: subscriptionQuery,
      variables: {
        after: this.props.data.currentProject.messages.pageInfo.lastCursor,
      },
    });
    this.querySubscription = observable.subscribe({
      next: result => this.updateCurrentData(result),
      // error: this.updateError,
    });
  }

  componentWillUnmount() {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
    }
  }

  updateCurrentData(result) {
    if (result.data.messages.type === 'ADDED') {
      this.addNewMessage(result.data.messages.node);
    } else if (result.data.messages.type === 'DELETED') {
      this.removeMessage(result.data.messages.node);
    }
  }

  addNewMessage(message) {
    const typename = message.source.__typename;
    const fragment = createSourceQuery(typename);
    const id = message.source.id;
    let existingSource;
    try {
      existingSource = this.props.client.readFragment({ id, fragment });
    } catch (e) {
      // XXX(@fson): refetching all data
      this.props.refetch();
      return;
    }
    const newMessages = {
      __typename: 'MessageConnection',
      count: existingSource.messages.count + 1,
      nodes: [...existingSource.messages.nodes, message],
    };
    this.props.client.writeFragment({
      id,
      fragment,
      data: {
        id,
        __typename: typename,
        messages: newMessages,
      },
    });
  }

  removeMessage(message) {
    const typename = message.source.__typename;
    const fragment = createSourceQuery(typename);
    const id = message.source.id;
    let existingSource;
    try {
      existingSource = this.props.client.readFragment({ id, fragment });
    } catch (e) {
      // XXX(@fson): refetching all data
      this.props.refetch();
      return;
    }
    const newNodes = existingSource.messages.nodes.filter(
      existingMessage => existingMessage.id !== message.id
    );
    const newMessages = {
      __typename: 'MessageConnection',
      count: newNodes.length,
      nodes: newNodes,
    };
    this.props.client.writeFragment({
      id,
      fragment,
      data: {
        id,
        __typename: typename,
        messages: newMessages,
      },
    });
  }

  render() {
    const {
      data: { currentProject, projectManagerLayout, processInfo },
      loading,
      error,
    } = this.props;

    const sources = currentProject.sources.filter(source => {
      return source.__typename !== 'Issues' || source.messages.count > 0;
    });
    let sections = projectManagerLayout.sources
      .map(({ id }) => currentProject.sources.find(source => source.id === id))
      .filter(section => section);
    if (sections.length === 0) {
      sections = [sources[0]];
    }
    const count = sections.length;
    const selectedId = projectManagerLayout.selected && projectManagerLayout.selected.id;

    return (
      <Root>
        <ProjectManager
          loading={loading}
          error={error}
          project={currentProject}
          processInfo={processInfo}
          renderableSections={sections}
          sections={sources}
          count={count}
          userAddress={this.props.userAddress}
          selectedId={selectedId}
          recipient={this.props.recipient}
          dispatch={this.props.dispatch}
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
  }
}

export default class IndexPage extends React.Component {
  client = process.browser ? createApolloClient() : null;

  render() {
    if (!this.client) {
      // Server-side rendering for static HTML export.
      return null;
    }

    return (
      <ApolloProvider client={this.client}>
        <Query query={query}>
          {result => {
            if (!result.loading && !result.error) {
              return <IndexPageContents {...result} />;
            } else {
              // TODO(freiksenet): fix loading states
              return null;
            }
          }}
        </Query>
      </ApolloProvider>
    );
  }
}
