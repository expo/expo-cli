import React from 'react';

import { css } from 'react-emotion';

import * as Constants from 'app/common/constants';

const STYLES_ERROR_CONTAINER = css`
  background: ${Constants.colors.foreground};
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: 100%;
  width: 100%;
  padding: 40px 60px;
  font-family: ${Constants.fontFamilies.regular};
  color: ${Constants.colors.white};
`;

const STYLE_MESSAGE = css`
  font-family: ${Constants.fontFamilies.mono};
  color: ${Constants.colors.white};
  line-height: 14px;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  margin-top: 20px;
`;

const STYLES_ERROR = css`
  color: ${Constants.colors.red};
`;

export default props => (
  <div className={STYLES_ERROR_CONTAINER}>
    <div className={STYLE_MESSAGE}>Error loading DevTools</div>
    {props.error.graphQLErrors.map(error => {
      return <div className={`${STYLE_MESSAGE} ${STYLES_ERROR}`}>{error.message}</div>;
    })}
  </div>
);
