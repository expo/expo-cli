import QRCodeReact from 'qrcode-react';
import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as Constants from 'app/common/constants';

const STYLES_INPUT = css`
  background: ${Constants.colors.white};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  display: inline-block;
  padding: 8px;
  border-radius: 4px;
`;

export default class QRCode extends React.Component {
  render() {
    return (
      <div className={STYLES_INPUT}>
        <QRCodeReact size={168} value={this.props.url} />
      </div>
    );
  }
}
