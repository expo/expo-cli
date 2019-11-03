import * as electron from 'electron';
import Menu from './Menu';

class WindowMenu extends Menu {
  componentDidMount() {
    this.onMenuUpdated();
  }

  componentDidUpdate() {
    this.onMenuUpdated();
  }

  componentWillUnmount() {
    const win = electron.remote.getCurrentWindow();

    if (win) {
      this.clearListeners(win);
      if (win.isFocused()) this.onBlur();
    }
  }

  clearListeners(win) {
    win.removeListener('focus', this.onFocus);
    win.removeListener('blur', this.onBlur);
  }

  onMenuUpdated() {
    const win = electron.remote.getCurrentWindow();

    if (!win) {
      return;
    }

    this.clearListeners(win);

    win.on('focus', this.onFocus);
    win.on('blur', this.onBlur);

    if (win.isFocused() || global.document.hasFocus()) {
      this.onFocus();
    }
  }

  onFocus = () => {
    const menu = this.getMenu();

    electron.remote.Menu.setApplicationMenu(menu);
  };

  onBlur = () => {
    const currentMenu = electron.remote.Menu.getApplicationMenu();

    if (currentMenu === this.menu) {
      electron.remote.Menu.setApplicationMenu(null);
    }
  };
}

export default WindowMenu;
