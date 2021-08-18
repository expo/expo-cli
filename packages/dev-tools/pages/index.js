import createApolloClient from 'app/common/createApolloClient';
import * as State from 'app/common/state';
import { initStore } from 'app/common/store';
import IndexPageErrors from 'app/components/IndexPageErrors';
import ProjectManager from 'app/components/ProjectManager';
import Root from 'app/components/Root';
import withRedux from 'app/higher-order/withRedux';
import gql from 'graphql-tag';
import pTimeout from 'p-timeout';
import React from 'react';
import { ApolloProvider, Query } from 'react-apollo';
import { SubscriptionClient } from 'subscriptions-transport-ws';

const MessageFragment = gql`
  fragment MessageFragment on Message {
    id
    msg
    time
    level
    ... on DeviceMessage {
      includesStack
    }
  }
`;

const query = gql`
  query IndexPageQuery {
    currentProject {
      id
      manifestUrl
      settings {
        hostType
        dev
        minify
      }
      config {
        name
        description
        slug
        githubUrl
        platforms
      }
      sources {
        id
        name
        messages {
          count
          unreadCount
          nodes {
            ...MessageFragment
          }
          pageInfo {
            lastReadCursor
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
      id
      selected {
        id
      }
      sources {
        id
      }
    }
    processInfo {
      isAndroidSimulatorSupported
      isIosSimulatorSupported
      webAppUrl
    }
    user {
      username
    }
  }
  ${MessageFragment}
`;

const projectPollQuery = gql`
  query IndexPagePollingQuery {
    currentProject {
      id
      manifestUrl
      settings {
        hostType
        dev
        minify
      }
      config {
        name
        description
        slug
        githubUrl
      }
    }
    userSettings {
      id
      sendTo
    }
    projectManagerLayout {
      id
      selected {
        id
      }
      sources {
        id
      }
    }
    processInfo {
      isAndroidSimulatorSupported
      isIosSimulatorSupported
      webAppUrl
    }
    user {
      username
    }
  }
`;

const subscriptionQuery = gql`
  subscription MessageSubscription($after: String) {
    messages(after: $after) {
      ... on MessagePayload {
        type
        cursor
        node {
          ...MessageFragment
          source {
            id
          }
        }
      }
      ... on SourceClearedPayload {
        source {
          id
        }
      }
    }
  }
  ${MessageFragment}
`;

const createSourceQuery = typename => gql`
  fragment ${typename}Fragment on ${typename} {
    __typename
    id
    messages {
      __typename
      count
      unreadCount
      nodes {
        ...MessageFragment
      }
      pageInfo {
        lastReadCursor
      }
    }
  }
  ${MessageFragment}
`;

@withRedux(initStore, state => state)
class IndexPageContents extends React.Component {
  state = {};

  _handleDeviceSelect = options => State.sourceSelect(options, this.props);
  _handleSectionDrag = options => State.sourceSwap(options, this.props);
  _handleSectionSelect = options => State.sectionSelect(options, this.props);
  _handleSectionDismiss = () => State.sectionClear(this.props);
  _handleChangeSectionCount = count => State.sectionCount({ count }, this.props);
  _handleUpdateState = options => State.update(options, this.props);
  _handleSimulatorClickIOS = () => State.openSimulator('IOS', this.props);
  _handleStartWebClick = () => State.openBrowser(this.props);
  _handleSimulatorClickAndroid = () => State.openSimulator('ANDROID', this.props);
  _handleHostTypeClick = hostType => State.setHostType({ hostType }, this.props);
  _handlePublishProject = options => State.publishProject(options, this.props);
  _handleToggleProductionMode = () => {
    const dev = !this.props.data.currentProject.settings.dev;
    State.setBuildFlags({ dev, minify: !dev }, this.props);
  };

  _handleSubmitPhoneNumberOrEmail = async () =>
    await State.sendProjectUrl(this.props.recipient, this.props);
  _handleKeyPress = event => {
    if (event.key === 'l' && event.ctrlKey) {
      if (this.props.data.projectManagerLayout.selected) {
        State.clearMessages({ source: this.props.data.projectManagerLayout.selected }, this.props);
      } else if (this.props.data.projectManagerLayout.sources.length) {
        State.clearMessages(
          { source: this.props.data.projectManagerLayout.sources[0] },
          this.props
        );
      }
    }
  };
  _handleClearMessages = source => State.clearMessages({ source }, this.props);

  componentDidMount() {
    if (this.props.data.userSettings.sendTo) {
      this._handleUpdateState({
        recipient: this.props.data.userSettings.sendTo,
      });
    }

    const subscriptionObservable = this.props.client.subscribe({
      query: subscriptionQuery,
      variables: {
        after: this.props.data.currentProject.messages.pageInfo.lastCursor,
      },
    });
    this.querySubscription = subscriptionObservable.subscribe({
      next: result => this.updateCurrentData(result),
      // error: this.updateError,
    });
    this.pollingObservable = this.props.client.watchQuery({
      query: projectPollQuery,
    });
    this.pollingObservable.startPolling(60000);

    document.addEventListener('keypress', this._handleKeyPress);

    this.updateTitle();
  }

  componentDidUpdate() {
    this.updateTitle();
  }

  componentWillUnmount() {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
    }
    if (this.pollingObservable) {
      this.pollingObservable.stopPolling();
    }
    document.removeEventListener('keypress', this._handleKeyPress);
  }

  updateCurrentData(result) {
    if (result.data.messages.__typename === 'SourceClearedPayload') {
      this.clearMessagesFromSource(result.data.messages.source);
    } else if (result.data.messages.type === 'ADDED') {
      const hostType = this.props.data.currentProject.settings.hostType;
      const typename = result.data.messages.node.__typename;
      if (
        (hostType === 'tunnel' && typename === 'TunnelReady') ||
        (hostType !== 'tunnel' && typename === 'MetroInitializeStarted')
      ) {
        this.pollingObservable.refetch();
      }
      this.addNewMessage(result.data.messages);
    } else if (result.data.messages.type === 'DELETED') {
      this.removeMessage(result.data.messages.node);
    }
  }

  addNewMessage({ cursor, node: message }) {
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

    let unreadCount = existingSource.messages.unreadCount;
    let lastReadCursor = existingSource.messages.pageInfo.lastReadCursor;
    const { currentProject, projectManagerLayout } = this.props.data;
    const { sections } = getSections(currentProject, projectManagerLayout);
    if (!document.hidden && sections.find(section => section.id === id)) {
      lastReadCursor = cursor;
      State.updateLastRead({ sourceId: id, sourceType: typename, lastReadCursor }, this.props);
    } else {
      unreadCount += 1;
    }

    const newMessages = {
      __typename: 'MessageConnection',
      unreadCount,
      count: existingSource.messages.count + 1,
      nodes: [...existingSource.messages.nodes, message],
      pageInfo: {
        __typename: 'PageInfo',
        lastReadCursor,
      },
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

  clearMessagesFromSource(source) {
    this.props.client.writeFragment({
      id: source.id,
      fragment: gql`
        fragment ClearMessagesFragment on Source {
          messages {
            count
            unreadCount
            nodes
          }
        }
      `,
      data: {
        __typename: source.__typename,
        messages: {
          __typename: 'MessageConnection',
          count: 0,
          unreadCount: 0,
          nodes: [],
        },
      },
    });
  }

  getTotalUnreadCount() {
    const { currentProject } = this.props.data;
    let count = 0;
    currentProject.sources.forEach(source => {
      count += source.messages.unreadCount;
    });
    return count;
  }

  updateTitle() {
    if (this.props.data) {
      const { name } = this.props.data.currentProject.config;
      const unreadCount = this.getTotalUnreadCount();
      let title;
      if (unreadCount > 0) {
        title = `(${unreadCount}) ${name} on Expo Developer Tools`;
      } else {
        title = `${name} on Expo Developer Tools`;
      }
      if (title !== document.title) {
        document.title = title;
      }
    }
  }

  render() {
    const {
      data: { currentProject, projectManagerLayout, processInfo, user },
      loading,
      error,
      disconnected,
    } = this.props;

    const { sections, sources } = getSections(currentProject, projectManagerLayout);
    const count = sections.length;
    const selectedId = projectManagerLayout.selected && projectManagerLayout.selected.id;

    return (
      <Root>
        <ProjectManager
          loading={loading}
          error={error}
          disconnected={disconnected}
          project={currentProject}
          user={user}
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
          isProduction={this.state.isProduction}
          onPublishProject={this._handlePublishProject}
          onToggleProductionMode={this._handleToggleProductionMode}
          onHostTypeClick={this._handleHostTypeClick}
          onSimulatorClickIOS={this._handleSimulatorClickIOS}
          onStartWebClick={this._handleStartWebClick}
          onSimulatorClickAndroid={this._handleSimulatorClickAndroid}
          onSectionDrag={this._handleSectionDrag}
          onSectionDismiss={this._handleSectionDismiss}
          onSectionSelect={this._handleSectionSelect}
          onSubmitPhoneNumberOrEmail={this._handleSubmitPhoneNumberOrEmail}
          onChangeSectionCount={this._handleChangeSectionCount}
          onDeviceSelect={this._handleDeviceSelect}
          onClearMessages={this._handleClearMessages}
          onUpdateState={this._handleUpdateState}
        />
      </Root>
    );
  }
}

function getSections(currentProject, projectManagerLayout) {
  const sources = currentProject.sources.filter(source => {
    return source.__typename !== 'Issues' || source.messages.count > 0;
  });
  let sections = projectManagerLayout.sources
    .map(({ id }) => currentProject.sources.find(source => source.id === id))
    .filter(section => section);
  if (sections.length === 0) {
    sections = [sources.find(source => source.__typename !== 'Issues')];
  }
  return {
    sections,
    sources,
  };
}

export default class IndexPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      disconnected: false,
      client: null,
    };
    this.unsubscribers = [];
  }

  componentDidMount() {
    this.connect().catch(_ => this.setState({ disconnected: true }));
  }

  async connect() {
    const response = await pTimeout(fetch('/dev-tools-info'), 10000);
    if (!response.ok) {
      throw new Error(`Dev Tools API returned an error: ${response.status}`);
    }
    const { webSocketGraphQLUrl, clientAuthenticationToken } = await response.json();
    this.subscriptionClient = new SubscriptionClient(webSocketGraphQLUrl, {
      reconnect: true,
      connectionParams: {
        clientAuthenticationToken,
      },
    });
    this.unsubscribers.push(
      this.subscriptionClient.on('connected', this._handleConnected),
      this.subscriptionClient.on('reconnected', this._handleConnected),
      this.subscriptionClient.on('disconnected', this._handleDisconnected)
    );
    this.setState({ client: createApolloClient(this.subscriptionClient) });
  }

  _handleConnected = () => this.setState({ disconnected: false });
  _handleDisconnected = () => this.setState({ disconnected: true });

  componentWillUnmount() {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }

  render() {
    if (!process.browser) {
      // Server-side rendering for static HTML export.
      return null;
    }

    if (!this.state.client) {
      return null;
    }

    return (
      <ApolloProvider client={this.state.client}>
        <Query query={query}>
          {result => {
            if (!result.loading && !result.error) {
              return <IndexPageContents {...result} disconnected={this.state.disconnected} />;
            } else if (result.error) {
              return <IndexPageErrors error={result.error} />;
            } else {
              // TODO(wschurman): maybe add a loading state
              return null;
            }
          }}
        </Query>
      </ApolloProvider>
    );
  }
}
