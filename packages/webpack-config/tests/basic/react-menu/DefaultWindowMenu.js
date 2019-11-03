import * as React from 'react';

import constants from './constants';
import MenuItem from './MenuItem';

export default function DefaultWindowMenu({ children }) {
  return (
    <MenuItem role="window">
      <MenuItem role="minimize" />
      <MenuItem role="close" />
      {children}
      {constants.isMac ? <MenuItem.Separator /> : null}
      {constants.isMac ? <MenuItem role="front" /> : null}
    </MenuItem>
  );
}
