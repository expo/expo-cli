import PropTypes from 'prop-types';
import * as electron from 'electron';

import Menu from './Menu';

class PopupMenu extends Menu {
  componentDidMount() {
    this.onMenuUpdated();
  }

  componentDidUpdate() {
    this.onMenuUpdated();
  }

  onMenuUpdated() {
    const { x, y } = this.props;

    if (!electron.remote || !electron.remote.getCurrentWindow()) {
      return;
    }

    const menu = this.getMenu();
    menu.popup(electron.remote.getCurrentWindow(), x, y);
  }
}

PopupMenu.propTypes = {
  ...Menu.propTypes,
  x: PropTypes.number,
  y: PropTypes.number,
};

export default PopupMenu;
