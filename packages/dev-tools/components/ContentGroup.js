import React from 'react';
import { css } from 'react-emotion';
import { VelocityTransitionGroup } from 'velocity-react';

import * as Constants from 'app/common/constants';

if (process.browser) {
  require('velocity-animate');
  require('velocity-animate/velocity.ui');
}

const STYLES_HEADER = css`
  width: 100%;
`;

const STYLES_CHILDREN = css`
  border-top: 1px solid ${Constants.colors.border};
  font-family: ${Constants.fontFamilies.regular};
  background: ${Constants.colors.sidebarBackground};
  padding: 16px;
`;

export default class ContentGroup extends React.Component {
  render() {
    return (
      <div>
        <header className={STYLES_HEADER}>{this.props.header}</header>
        <VelocityTransitionGroup
          enter={{ animation: 'slideDown', duration: 300 }}
          leave={{ animation: 'slideUp', duration: 300 }}>
          {this.props.isActive ? (
            <div className={STYLES_CHILDREN}>{this.props.children}</div>
          ) : undefined}
        </VelocityTransitionGroup>
      </div>
    );
  }
}
