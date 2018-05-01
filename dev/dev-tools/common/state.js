import gql from 'graphql-tag';

import * as Sets from 'app/common/sets';

export const deviceSelect = ({ id }, props) => {
  const existingIndex = Sets.findIndex(props.devices, id);

  if (existingIndex < props.count) {
    props.dispatch({ type: 'UPDATE', state: { selectedId: id } });
    return;
  }

  if (props.selectedId) {
    const selectedIndex = Sets.findIndex(props.devices, props.selectedId);
    const swapDevices = Sets.swap(props.devices, selectedIndex, existingIndex);

    props.dispatch({ type: 'UPDATE', state: { devices: swapDevices, selectedId: id } });
    return;
  }

  const devices = Sets.swap(props.devices, 0, existingIndex);
  props.dispatch({ type: 'UPDATE', state: { devices, selectedId: id } });
};

export const deviceSwap = ({ oldId, newId }, props) => {
  const oldIndex = Sets.findIndex(props.devices, oldId);
  const newIndex = Sets.findIndex(props.devices, newId);
  const devices = Sets.swap(props.devices, oldIndex, newIndex);

  props.dispatch({ type: 'UPDATE', state: { devices, selectedId: newId } });
};

export const sectionSelect = ({ id }, props) => {
  props.dispatch({ type: 'UPDATE', state: { selectedId: id } });
};

export const sectionClear = props => {
  props.dispatch({ type: 'UPDATE', state: { selectedId: null } });
};

export const sectionCount = ({ count }, props) => {
  props.dispatch({ type: 'UPDATE', state: { count, isPublishing: false } });
};

export const update = (state, props) => {
  props.dispatch({ type: 'UPDATE', state });
};

export const openSimulator = (platform, props) => {
  props.dispatch({
    type: 'ADD_TOAST',
    toast: {
      id: new Date().getTime(),
      text: `We are trying to open a ${platform} simulator. If nothing appears it means you do not have the simulator installed on your machine.`,
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

export const sendProjectUrl = (recipient, props) => {
  props.dispatch({
    type: 'ADD_TOAST',
    toast: {
      id: new Date().getTime(),
      name: 'success',
      text: `We sent ${recipient} a link to open this project.`,
    },
  });

  return props.client.mutate({
    mutation: gql`
      mutation SendProjectUrl($recipient: String!) {
        sendProjectUrl(recipient: $recipient) {
          medium
        }
      }
    `,
    variables: { recipient },
  });
};

export const publishProject = props => {
  props.dispatch({
    type: 'ADD_TOAST',
    toast: {
      id: new Date().getTime(),
      name: 'success',
      text: `We have successfully published your project.`,
    },
  });
};
