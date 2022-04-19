import { ApolloError } from 'apollo-client';
import * as Sets from 'app/common/sets';
import gql from 'graphql-tag';
import set from 'lodash/fp/set';
import uniqBy from 'lodash/uniqBy';
import React from 'react';

const delay = time => new Promise(resolve => window.setTimeout(resolve, time));

export const sourceSelect = (source, props) => {
  const { projectManagerLayout: layout } = props.data;
  const existingIndex = layout.sources.findIndex(s => s.id === source.id);
  const selected = source.id;

  let sources;
  if (existingIndex >= 0) {
    // If source is already shown, only select it.
    sources = layout.sources;
  } else {
    const selectedIndex = layout.sources.findIndex(
      s => layout.selected && s.id === layout.selected.id
    );
    // Replace the source in the selected panel.
    // If selectedIndex is -1 (no panel selected), set the first item.
    sources = set(Math.max(selectedIndex, 0), source, layout.sources);
  }

  // NOTE(jim): Breaks out of publishing modal.
  props.dispatch({
    type: 'UPDATE',
    state: {
      isPublishing: false,
    },
  });

  return updateLayout(props.client, layout.id, { selected, sources });
};

export const sourceSwap = ({ targetSourceId, movedSourceId }, props) => {
  const { projectManagerLayout: layout, currentProject } = props.data;
  const targetIndex = layout.sources.findIndex(source => source.id === targetSourceId);
  const movedIndex = layout.sources.findIndex(source => source.id === movedSourceId);
  let sources;
  if (movedIndex === -1) {
    const newSource = currentProject.sources.find(source => source.id === movedSourceId);
    sources = set(targetIndex, newSource, layout.sources);
  } else {
    sources = Sets.swap(layout.sources, targetIndex, movedIndex);
  }

  return updateLayout(props.client, layout.id, {
    selected: layout.selected ? layout.selected.id : null,
    sources,
  });
};

export const sectionSelect = ({ id }, props) => {
  const { projectManagerLayout: layout } = props.data;
  const layoutInput = {
    selected: id,
    sources: layout.sources,
  };
  return updateLayout(props.client, layout.id, layoutInput);
};

export const sectionClear = props => {
  const { projectManagerLayout: layout } = props.data;
  const layoutInput = {
    selected: null,
    sources: layout.sources,
  };
  return updateLayout(props.client, layout.id, layoutInput);
};

export const sectionCount = ({ count }, props) => {
  const { projectManagerLayout: layout, currentProject } = props.data;
  const sources = currentProject.sources.filter(source => {
    return source.__typename !== 'Issues' || source.messages.count > 0;
  });
  let newSources;
  if (count > layout.sources.length) {
    newSources = uniqBy([...layout.sources, ...sources], source => source.id).slice(0, count);
  } else {
    newSources = layout.sources.slice(0, count);
  }

  let selected;
  if (layout.selected && newSources.some(source => source.id === layout.selected.id)) {
    selected = layout.selected.id;
  } else {
    selected = null;
  }

  const layoutInput = {
    selected,
    sources: newSources,
  };

  // NOTE(jim): Breaks out of publishing modal.
  props.dispatch({
    type: 'UPDATE',
    state: {
      isPublishing: false,
    },
  });

  return updateLayout(props.client, layout.id, layoutInput);
};

export const update = (state, props) => {
  props.dispatch({ type: 'UPDATE', state });
};

const UPDATE_PROJECT_MANAGER_QUERY = gql`
  mutation UpdateProjectManagerLayout($input: ProjectManagerLayoutInput!) {
    setProjectManagerLayout(input: $input) {
      id
      selected {
        id
      }
      sources {
        id
        messages {
          unreadCount
        }
      }
    }
  }
`;

function updateLayout(client, id, input) {
  return client.mutate({
    mutation: UPDATE_PROJECT_MANAGER_QUERY,
    variables: {
      input: {
        selected: input.selected,
        sources: input.sources.map(source => source.id),
      },
    },
    optimisticResponse: {
      __typename: 'Mutation',
      setProjectManagerLayout: {
        __typename: 'ProjectManagerLayout',
        id,
        selected: input.selected
          ? client.readFragment({
              id: input.selected,
              fragment: gql`
                fragment SelectedSource on Source {
                  __typename
                  id
                }
              `,
            })
          : null,
        sources: input.sources.map(source => ({
          ...source,
          messages: {
            __typename: 'MessageConnection',
            unreadCount: 0,
          },
        })),
      },
    },
  });
}

export const openBrowser = async props => {
  const id = new Date().getTime();

  // NOTE(jim): Breaks out of publishing modal.
  props.dispatch({
    type: 'UPDATE',
    state: {
      isPublishing: false,
    },
  });

  props.dispatch({
    type: 'ADD_TOAST',
    toast: {
      id,
      name: 'info',
      text: `Attempting to open the project in a web browser...`,
    },
  });

  let hasError = false;
  try {
    const result = await props.client.mutate({
      mutation: gql`
        mutation OpenWeb {
          openWeb {
            error
          }
        }
      `,
      variables: {},
    });
    if (result.data.openWeb.error) {
      hasError = true;
    }
  } catch {
    hasError = true;
  }

  if (!hasError) {
    props.dispatch({
      type: 'REMOVE_TOAST',
      id,
    });
  } else {
    props.dispatch({
      type: 'ADD_TOAST',
      toast: {
        id,
        name: 'error',
        text: `Error opening for web. Check logs for details.`,
      },
    });
  }
};

export const openSimulator = async (platform, props) => {
  const id = new Date().getTime();
  // NOTE(jim): Breaks out of publishing modal.
  props.dispatch({
    type: 'UPDATE',
    state: {
      isPublishing: false,
    },
  });

  props.dispatch({
    type: 'ADD_TOAST',
    toast: {
      id,
      name: 'info',
      text: `Attempting to open a simulator...`,
    },
  });

  let hasError = false;
  // TODO(freiksenet): Add generic error handling
  try {
    const result = await props.client.mutate({
      mutation: gql`
        mutation OpenSimulator($platform: Platform!) {
          openSimulator(platform: $platform) {
            __typename
          }
        }
      `,
      variables: { platform },
    });
    hasError = result.data.openSimulator.__typename === 'OpenSimulatorError';
  } catch {
    hasError = true;
  }

  if (!hasError) {
    props.dispatch({
      type: 'ADD_TOAST',
      toast: {
        id,
        name: 'success',
        text: `Simulator ready`,
      },
    });

    await delay(2000);

    props.dispatch({
      type: 'REMOVE_TOAST',
      id,
    });
  } else {
    props.dispatch({
      type: 'ADD_TOAST',
      toast: {
        id,
        name: 'error',
        text: `Error opening simulator. Check Metro logs for details.`,
      },
    });
  }
};

export const setHostType = ({ hostType }, { client }) => {
  return client.mutate({
    mutation: gql`
      mutation SetHostType($hostType: HostType!) {
        setProjectSettings(settings: { hostType: $hostType }) {
          id
          manifestUrl
          settings {
            hostType
          }
        }
      }
    `,
    variables: { hostType },
  });
};

export const setBuildFlags = ({ dev, minify }, { client }) => {
  return client.mutate({
    mutation: gql`
      mutation SetBuildFlags($dev: Boolean!, $minify: Boolean!) {
        setProjectSettings(settings: { dev: $dev, minify: $minify }) {
          id
          settings {
            dev
            minify
          }
        }
      }
    `,
    variables: { dev, minify },
  });
};

export const sendProjectUrl = async (recipient, props) => {
  if (!props.data.user.username) {
    props.dispatch({
      type: 'ADD_TOAST',
      toast: {
        id: 'authentication-required',
        name: 'info',
        text: 'Authentication is required. Please check the terminal to log in.',
      },
    });
  }
  try {
    await props.client.mutate({
      mutation: gql`
        mutation SendProjectUrl($recipient: String!) {
          sendProjectUrl(recipient: $recipient) {
            medium
          }
        }
      `,
      variables: { recipient },
    });
  } catch (error) {
    if (error instanceof ApolloError) {
      props.dispatch({
        type: 'ADD_TOAST',
        toast: {
          id: 'send-email-or-number',
          name: 'error',
          text: `Oops, sending a link to "${recipient}" failed.`,
        },
      });
      return;
    } else {
      throw error;
    }
  }

  props.dispatch({
    type: 'ADD_TOAST',
    toast: {
      id: 'send-email-or-number',
      name: 'success',
      text: `We sent ${recipient} a link to open this project.`,
    },
  });
};

export const updateProjectConfig = (config, props) => {
  return props.client.mutate({
    mutation: gql`
      mutation SetProjectConfig($input: ProjectConfigInput!) {
        setProjectConfig(input: $input) {
          id
          config {
            name
            description
            slug
            githubUrl
          }
        }
      }
    `,
    variables: {
      input: config,
    },
  });
};

export const publishProject = async (options, props) => {
  const publishingId = new Date().getTime();
  props.dispatch({
    type: 'ADD_TOAST',
    toast: {
      id: publishingId,
      name: 'info',
      text: `Publishing...`,
    },
  });
  await updateProjectConfig(options.config, props);
  update(
    {
      isPublishing: false,
    },
    props
  );
  if (options.optimize) {
    await props.client.mutate({
      mutation: gql`
        mutation OptimizeAssets {
          optimizeAssets {
            projectDir
          }
        }
      `,
    });
  }
  let result;
  try {
    result = await props.client.mutate({
      mutation: gql`
        mutation PublishProject {
          publishProject {
            url
          }
        }
      `,
    });
  } catch (error) {
    props.dispatch({
      type: 'ADD_TOAST',
      toast: {
        id: new Date().getTime(),
        name: 'alert',
        text: `Failed to publish the project. See Metro logs for details.`,
      },
    });
    throw error;
  } finally {
    props.dispatch({
      type: 'REMOVE_TOAST',
      id: publishingId,
    });
  }
  const url = result.data.publishProject.url;
  props.dispatch({
    type: 'ADD_TOAST',
    toast: {
      id: new Date().getTime(),
      name: 'success',
      text: (
        <span>
          Successfully published to{' '}
          <a target="_blank" href={url}>
            {url}
          </a>
          .
        </span>
      ),
    },
  });
};

const UPDATE_LAST_READ = gql`
  mutation UpdateLastread($sourceId: ID!, $lastReadCursor: String!) {
    updateLastRead(sourceId: $sourceId, lastReadCursor: $lastReadCursor) {
      id
      messages {
        unreadCount
        pageInfo {
          lastReadCursor
        }
      }
    }
  }
`;

export const updateLastRead = async ({ sourceId, sourceType, lastReadCursor }, props) => {
  return props.client.mutate({
    mutation: UPDATE_LAST_READ,
    variables: {
      sourceId,
      lastReadCursor,
    },
    optimisticResponse: {
      __typename: 'Mutation',
      updateLastRead: {
        id: sourceId,
        __typename: sourceType,
        messages: {
          unreadCount: 0,
          __typename: 'MessageConnection',
          pageInfo: {
            __typename: 'PageInfo',
            lastReadCursor,
          },
        },
      },
    },
  });
};

export const clearMessages = async ({ source }, props) => {
  return props.client.mutate({
    mutation: gql`
      mutation ClearMessages($sourceId: ID!) {
        clearMessages(sourceId: $sourceId) {
          id
          messages {
            count
            unreadCount
          }
        }
      }
    `,
    variables: {
      sourceId: source.id,
    },
    optimisticResponse: {
      __typename: 'Mutation',
      clearMessages: {
        __typename: source.__typename,
        id: source.id,
        messages: {
          __typename: 'MessageConnection',
          count: 0,
          unreadCount: 0,
          nodes: [],
        },
      },
    },
  });
};
