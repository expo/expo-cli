/**
 * @flow
 */

export const actions = {
  addNotification: (message: string) => {
    return {
      type: 'ADD_NOTIFICATION',
      message,
    };
  },
};

export const reducer = (state: any = {}, action: any) => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        message: action.message,
      };
    default:
      return state;
  }
};
