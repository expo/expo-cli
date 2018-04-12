import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const STYLES_HEADER = css`
  border-bottom: 1px solid ${Constants.colors.border};
  width: 100%;
`;

const STYLES_CHILDREN = css`
  font-family: ${Constants.fontFamilies.regular};
  background: rgb(248, 248, 248);
  padding: 16px;
`;

export default class ProjectManagerSidebarSection extends React.Component {
  render() {
    return (
      <div>
        <header className={STYLES_HEADER}>{this.props.header}</header>
        {this.props.isActive ? (
          <div className={STYLES_CHILDREN}>{this.props.children}</div>
        ) : (
          undefined
        )}
      </div>
    );
  }
}
