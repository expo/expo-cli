import styled, { css } from 'react-emotion';

import * as Constants from 'app/common/constants';

const SmallButton = styled('span')`
  border: 1px solid ${Constants.colors.darkBorder};
  color: ${Constants.colors.darkButtonColor};
  height: 28px;
  width: 28px;
  margin-left: 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 200ms ease all;
  transition-property: border, color;

  :hover {
    border: 1px solid ${Constants.colors.border};
    color: ${Constants.colors.border};
  }
`;

export default SmallButton;
