import { remote } from 'electron';

import DeclarativeElement from './DeclarativeElement';

const { TouchBar } = remote;

export default class TouchBarView extends DeclarativeElement {
  getTypes() {
    return ['touch-bar-item'];
  }
  componentDidMount() {
    this.update();
  }
  componentDidUpdate() {
    this.update();
  }

  update() {
    console.log('redraw TB');
    const items = this.getItems();
    const tray = new TouchBar({ items });
    remote.getCurrentWindow().setTouchBar(tray);
    return tray;
  }

  getItems() {
    const json = this.getJSON();
    const menuJson = json
      .filter(({ _type }) => _type === 'touch-bar-item')
      .map(({ getItem }) => getItem())
      .filter(item => {
        console.log('FILTER', item);
        return item.type !== 'group';
      });
    return menuJson;
  }
}
