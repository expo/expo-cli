import * as React from 'react';
import ReactTestRenderer from 'react-test-renderer';

export default class DeclarativeElement extends React.Component {
  getTypes() {
    return ['custom-span'];
  }
  /**
   * Convert an array of json from ReactTestRenderer into a menu template
   * @param {JSON} json
   * @return {Object} menuItem?
   */
  jsonToMap = json => {
    return json.map(o => this.jsonToMapItem(o)).filter(Boolean);
  };

  /**
   * Convert a json from ReactTestRenderer into a menu item template.
   * @param {JSON} json
   * @return {Object} menuItem?
   */
  jsonToMapItem = json => {
    if (!this.getTypes().includes(json.type)) {
      return null;
    }
    // if (json.type !== 'menu-item') {
    //   return null;
    // }

    const item = json.props || {};
    item._type = json.type;
    if (item.getItem) item._item = item.getItem();

    // item.click = item.onClick;
    // delete item.onClick;

    item.submenu = item.submenu || (json.children ? this.jsonToMap(json.children) : undefined);

    return item;
  };
  getJSON() {
    const { children } = this.props;
    const el = <div>{children}</div>;

    const renderer = ReactTestRenderer.create(el);
    const json = renderer.toJSON();

    console.log('>>>>', renderer.toTree());

    if (json.children) {
      this.json = this.jsonToMap(json.children);
    }
    return this.json;
  }

  render() {
    return null;
  }
}
