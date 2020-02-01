import QRCodeReact from 'qrcode.react';
import { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const PADDING = 8;

const STYLES_CONTAINER = css`
  background: ${Constants.colors.white};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  display: inline-block;
  width: ${Constants.breakpoints.sidebar - 2 * 16}px;
  height: ${Constants.breakpoints.sidebar - 2 * 16}px;
  padding: ${PADDING}px;
  border-radius: 4px;
  position: relative;
  z-index: 1;
  transition: transform 200ms;
  transform-origin: left bottom;

  &:hover {
    transform: scale(1.5);
  }

  @media only screen and (max-width: ${Constants.breakpoints.medium}px) {
    width: ${Constants.breakpoints.smallSidebar - 2 * 16}px;
    height: ${Constants.breakpoints.smallSidebar - 2 * 16}px;
  }
`;

export default class QRCode extends React.Component {
  render() {
    if (!this.props.url) return null;
    return (
      <div className={STYLES_CONTAINER}>
        {/* TODO: size should be a number not a string */}
        <QRCodeReact renderAs="svg" size="100%" value={this.props.url} />
      </div>
    );
  }
}
