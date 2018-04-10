import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';
import * as SVG from 'app/common/svg';

const STYLES_VIEWING_OPTIONS_LINK = css`
  border-bottom: 1px solid ${Constants.colors.border};
  font-family: 'prototype-regular-demi';
  padding: 8px 16px 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: 200ms ease all;
  color: #333333;
  cursor: pointer;

  :hover {
    background: ${Constants.colors.border};
  }
`;

const STYLES_VIEWING_OPTIONS_LINK_LEFT = css`
  min-width: 25%;
  width: 100%;
`;

const STYLES_VIEWING_OPTIONS_LINK_RIGHT = css`
  flex-shrink: 0;
`;

export default class ProjectManagerViewingOption extends React.Component {
  render() {
    return (
      <div className={STYLES_VIEWING_OPTIONS_LINK} onClick={this.props.onClick}>
        <span className={STYLES_VIEWING_OPTIONS_LINK_LEFT}>{this.props.children}</span>
        <span className={STYLES_VIEWING_OPTIONS_LINK_RIGHT}>
          <SVG.Arrow
            size="16px"
            style={{
              color: '#333333',
            }}
          />
        </span>
      </div>
    );
  }
}
