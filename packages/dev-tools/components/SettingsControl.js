import { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const STYLES_SETTINGS_CONTROL = css`
  font-family: ${Constants.fontFamilies.mono};
  color: #555555;
  font-size: 10px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const STYLES_SETTINGS_CONTROL_LEFT = css`
  text-align: left;
  width: 100%;
  min-width: 25%;
  padding-right: 16px;
`;

const STYLES_SETTINGS_CONTROL_RIGHT = css`
  flex-shrink: 0;
`;

const STYLES_SELECTOR = css`
  border-radius: 24px;
  height: 24px;
  width: 48px;
  position: relative;
  display: inline-flex;
  transition: 200ms ease;
`;

const STYLES_SELECTOR_IS_ACTIVE = css`
  background: ${Constants.colors.primary};
`;

const STYLES_SELECTOR_DEFAULT = css`
  background: ${Constants.colors.border};
`;

const STYLES_SELECTOR_BUBBLE = css`
  cursor: pointer;
  position: absolute;
  left: 2px;
  top: 2px;
  border-radius: 20px;
  height: 20px;
  width: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  background: ${Constants.colors.white};
  transition: 200ms transform;
`;

const STYLES_SELECTOR_BUBBLE_IS_ACTIVE = css`
  transform: translateX(24px);
`;

export default props => {
  const selectorClassName = props.isActive
    ? `${STYLES_SELECTOR_IS_ACTIVE} ${STYLES_SELECTOR}`
    : `${STYLES_SELECTOR_DEFAULT} ${STYLES_SELECTOR}`;

  const bubbleClassName = props.isActive
    ? `${STYLES_SELECTOR_BUBBLE} ${STYLES_SELECTOR_BUBBLE_IS_ACTIVE}`
    : `${STYLES_SELECTOR_BUBBLE}`;

  return (
    <div className={STYLES_SETTINGS_CONTROL}>
      <span className={STYLES_SETTINGS_CONTROL_LEFT}>{props.children}</span>

      <span className={STYLES_SETTINGS_CONTROL_RIGHT}>
        <span className={selectorClassName} onClick={props.onClick}>
          <span className={bubbleClassName} />
        </span>
      </span>
    </div>
  );
};
