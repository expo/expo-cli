import * as React from 'react';

import MenuItem from './MenuItem';

function DefaultEditMenu({ children }) {
  return (
    <MenuItem id="edit" label="Edit">
      <MenuItem role="undo" />
      <MenuItem role="redo" />
      <MenuItem.Separator />
      <MenuItem role="cut" />
      <MenuItem role="copy" />
      <MenuItem role="paste" />
      <MenuItem role="pasteandmatchstyle" />
      <MenuItem role="delete" />
      <MenuItem role="selectall" />
      {children}
    </MenuItem>
  );
}

export default DefaultEditMenu;
