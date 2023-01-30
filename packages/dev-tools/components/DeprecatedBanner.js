import * as Constants from 'app/common/constants';
import React from 'react';
import { css } from 'react-emotion';

const STYLES_BANNER = css`
  padding: 16px;
  width: 100%;
  background-color: ${Constants.colors.red};
`;
const STYLES_INDICATOR = css`
  font-family: ${Constants.fontFamilies.mono};
  color: ${Constants.colors.white};
  font-size: 12px;
  padding-top: 2px;
`;

export default function DeprecatedBanner() {
  return (
    <div className={STYLES_BANNER}>
      <span className={STYLES_INDICATOR}>
        The Expo CLI Web UI is deprecated, please use the Terminal UI instead.{' '}
        <a
          style={{ color: 'white' }}
          href="https://blog.expo.dev/sunsetting-the-web-ui-for-expo-cli-ab12936d2206">
          Learn more
        </a>
        .
      </span>
    </div>
  );
}
