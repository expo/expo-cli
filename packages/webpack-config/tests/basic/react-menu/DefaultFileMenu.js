import PropTypes from 'prop-types';
import * as React from 'react';

import constants from './constants';
import MenuItem from './MenuItem';

function DefaultFileMenu({ appName, children, onAbout }) {
  return (
    <MenuItem id="file" label={appName}>
      <MenuItem
        label={`About ${appName}`}
        selector="orderFrontStandardAboutPanel"
        onClick={onAbout}
        role="about"
      />
      {children}
      <MenuItem role="toggledevtools" />
      {constants.isMac ? <MenuItem.Separator /> : null}
      {constants.isMac ? <MenuItem label="Services" submenu={[]} /> : null}
      {constants.isMac ? <MenuItem.Separator /> : null}
      {constants.isMac ? <MenuItem role="close" /> : null}
      {constants.isMac ? <MenuItem role="hide" /> : null}
      {constants.isMac ? <MenuItem role="hideothers" /> : null}
      {constants.isMac ? <MenuItem role="unhide" /> : null}
      {constants.isMac ? <MenuItem.Separator /> : null}
      <MenuItem role="quit" />
    </MenuItem>
  );
}

DefaultFileMenu.propTypes = {
  appName: PropTypes.string.isRequired,
  onAbout: PropTypes.func,
  children: PropTypes.node,
};

DefaultFileMenu.defaultProps = {
  onAbout: () => {},
};

export default DefaultFileMenu;
