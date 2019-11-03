import * as React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { renderToString } from 'react-dom/server';

/**
 * Render a set of react children to a menu
 * @param  {ReactElement} el
 * @param  {Object} electron
 * @return {Menu} menu?
 */
function renderToMenu(el, electron) {
  const { Menu } = electron.remote;

  const renderer = ReactTestRenderer.create(el);
  // const markup = renderToString(el);
  const json = renderer.toJSON();
  const children = json.children;
  const template = jsonToMenu(children);

  return Menu.buildFromTemplate(template);
}

/**
 * Convert an array of json from ReactTestRenderer into a menu template
 * @param {JSON} json
 * @return {Object} menuItem?
 */
function jsonToMenu(json) {
  return json.map(o => jsonToMenuItem(o)).filter(o => Boolean(o));
}

/**
 * Convert a json from ReactTestRenderer into a menu item template.
 * @param {JSON} json
 * @return {Object} menuItem?
 */
function jsonToMenuItem(json) {
  if (json.type !== 'menu-item') {
    return null;
  }

  const item = json.props;

  item.click = item.onClick;
  delete item.onClick;

  item.submenu = item.submenu || (json.children ? jsonToMenu(json.children) : undefined);

  return item;
}

export { renderToMenu };
