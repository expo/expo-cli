/**
 * @flow
 */

export const actions = {
  selectPackagerPane: (projectRoot: string) => {
    return {
      type: 'SELECT_PACKAGER_PANE',
      projectRoot,
    };
  },

  selectNotificationsPane: (projectRoot: string) => {
    return {
      type: 'SELECT_NOTIFICATIONS_PANE',
      projectRoot,
    };
  },
};

const PACKAGER_PANE = 0;
const NOTIFICATIONS_PANE = 1;

const INITIAL_PROJECT_STATE = {
  selectedLeftPane: PACKAGER_PANE,
  isPackagerSelected: true,
  isNotificationsSelected: false,
};

export const reducer = (state: any = {}, action: any) => {
  switch (action.type) {
    case 'SELECT_PACKAGER_PANE':
      return _selectPane(state, action, PACKAGER_PANE);
    case 'SELECT_NOTIFICATIONS_PANE':
      return _selectPane(state, action, NOTIFICATIONS_PANE);
    default:
      return state;
  }
};

function _selectPane(state: any, action: any, pane: number) {
  let { projectRoot } = action;

  let projectObject = state[projectRoot] || INITIAL_PROJECT_STATE;
  projectObject.selectedLeftPane = pane;
  projectObject.isPackagerSelected = pane === PACKAGER_PANE;
  projectObject.isNotificationsSelected = pane === NOTIFICATIONS_PANE;

  // TODO: switch to immutable.js
  let newState = JSON.parse(JSON.stringify(state));
  newState[projectRoot] = projectObject;

  return newState;
}
