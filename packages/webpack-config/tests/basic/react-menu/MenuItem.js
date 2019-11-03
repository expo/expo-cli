import * as React from 'react';
import PropTypes from 'prop-types';

export const TYPES = {
  NORMAL: 'normal',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  SEPARATOR: 'separator',
  SUBMENU: 'submenu',
};

function MenuItem({ children, ...props }) {
  return <menu-item {...props}>{children}</menu-item>;
}

export const Separator = () => <MenuItem type={TYPES.SEPARATOR} />;

MenuItem.propTypes = {
  label: PropTypes.string,
  role: PropTypes.string,
  type: PropTypes.string,
  accelerator: PropTypes.string,
  icon: PropTypes.string,
  checked: PropTypes.bool,
  enabled: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node,
};

MenuItem.Separator = Separator;

MenuItem.TYPES = TYPES;

export default MenuItem;
