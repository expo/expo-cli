import React from 'react';
import gql from 'graphql-tag';
import uniqBy from 'lodash/uniqBy';
import set from 'lodash/fp/set';
import { ApolloError } from 'apollo-client';

import * as Sets from 'app/common/sets';

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
  let newSources;
  if (count > layout.sources.length) {
    newSources = uniqBy([...layout.sources, ...currentProject.sources], source => source.id);
  } else {
    newSources = layout.sources.slice(0, count);
  }
  let selected = layout.selected ? layout.selected.id : null;

  if (layout.selected && !newSources.some(source => source.id === layout.selected.id)) {
    selected = null;
  }

  const layoutInput = {
    selected,
    sources: newSources,
  };
  return updateLayout(props.client, layout.id, layoutInput);
};

export const update = (state, props) => {
  props.dispatch({ type: 'UPDATE', state });
};

const PROJECT_MANAGER_LAYOUT_FRAGMENT = gql`
  fragment ProjectManagerLayoutFragment on ProjectManagerLayout {
    id
    selected {
      id
    }
    sources {
      id
    }
  }
`;

const UPDATE_PROJECT_MANAGER_QUERY = gql`
  mutation UpdateProjectManagerLayout($input: ProjectManagerLayoutInput!) {
    setProjectManagerLayout(input: $input) {
      ...ProjectManagerLayoutFragment
    }
  }

  ${PROJECT_MANAGER_LAYOUT_FRAGMENT}
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
    update(cache, { data: { setProjectManagerLayout } }) {
      cache.writeFragment({
        id,
        fragment: PROJECT_MANAGER_LAYOUT_FRAGMENT,
        data: setProjectManagerLayout,
      });
    },
    optimisticResponse: {
      __typename: 'Mutation',
      setProjectManagerLayout: {
        __typename: 'ProjectManagerLayout',
        id,
        selected: {
          __typename: 'Source',
          id: input.selected,
        },
        sources: input.sources,
      },
    },
  });
}

export const openSimulator = (platform, props) => {
  props.dispatch({
    type: 'ADD_TOAST',
    toast: {
      id: new Date().getTime(),
      name: 'info',
      text: `Attempting to open a simulator...`,
    },
  });

  return props.client.mutate({
    mutation: gql`
      mutation OpenSimulator($platform: Platform!) {
        openSimulator(platform: $platform) {
          url
        }
      }
    `,
    variables: { platform },
  });
};

export const setProjectSettings = (settings, props) => {
  return props.client.mutate({
    mutation: gql`
      mutation SetProjectSettings($settings: ProjectSettingsInput!) {
        setProjectSettings(settings: $settings) {
          id
          manifestUrl
          settings {
            hostType
          }
        }
      }
    `,
    variables: { settings },
  });
};

export const sendProjectUrl = async (recipient, props) => {
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
  const result = await props.client.mutate({
    mutation: gql`
      mutation PublishProject {
        publishProject {
          url
        }
      }
    `,
  });
  props.dispatch({
    type: 'REMOVE_TOAST',
    id: publishingId,
  });
  if (!result.errors) {
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
            </a>.
          </span>
        ),
      },
    });
  } else {
    props.dispatch({
      type: 'ADD_TOAST',
      toast: {
        id: new Date().getTime(),
        name: 'alert',
        text: `Failed to publish the project. See Metro logs for details.`,
      },
    });
  }
};
