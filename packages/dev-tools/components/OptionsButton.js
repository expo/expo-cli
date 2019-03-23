import styled, { css } from 'react-emotion';
import * as Constants from 'app/common/constants';

const OptionsButton = styled.span`
  font-family: ${Constants.fontFamilies.demi};
  border-left: 1px solid ${Constants.colors.border};
  flex-shrink: 0;
  cursor: pointer;
  padding: 0 16px 0 16px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  ${props => (!props.isDisabled ? OptionsButtonHover : '')};

  ${props => (props.isActive ? OptionsButtonActive : '')};

  ${props => (props.isDisabled ? OptionsButtonDisabled : '')};
`;

const OptionsButtonHover = css`
  :hover {
    background: ${Constants.colors.border};
  }
`;

const OptionsButtonActive = css`
  box-shadow: inset 0 -2px 0 ${Constants.colors.primary};
  border-left: 1px solid ${Constants.colors.border};

  :hover {
    background: ${Constants.colors.white};
  }
`;

const OptionsButtonDisabled = css`
  cursor: default;
  color: ${Constants.colors.border};
`;

export default OptionsButton;
