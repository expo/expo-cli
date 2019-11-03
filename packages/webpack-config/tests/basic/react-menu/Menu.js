import * as electron from 'electron';
import PropTypes from 'prop-types';
import * as React from 'react';

import { renderToMenu } from './render';

class Menu extends React.Component {
  getMenu() {
    const { children } = this.props;
    this.menu = renderToMenu(<div>{children}</div>, electron);

    return this.menu;
  }

  render() {
    return null;
  }
}

Menu.propTypes = {
  children: PropTypes.node.isRequired,
};

// React.forwardRef((props, ref) => {
//   React.useImperativeHandle(ref, {
//     getMenu() {
//       this.menu = renderToMenu(<div>{props.children}</div>, electron);

//       return this.menu;
//     }
//   });
//   return null;
// });

export default Menu;
