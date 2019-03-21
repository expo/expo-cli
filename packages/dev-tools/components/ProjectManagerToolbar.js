import { css } from 'react-emotion';

import * as React from 'react';
import * as SVG from 'app/common/svg';

import SmallSquareButton from 'app/components/SmallSquareButton';

const STYLES_TOOLBAR = css`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

export default class ProjectManagerToolbar extends React.Component {
  render() {
    return (
      <div className={STYLES_TOOLBAR}>
        {this.props.count > 1 && (
          <SmallSquareButton
            onClick={() => this.props.onChangeSectionCount(1)}
            isActive={this.props.renderableCount === 1 && !this.props.isPublishing}>
            <SVG.One size="32px" />
          </SmallSquareButton>
        )}
        {this.props.count > 1 && (
          <SmallSquareButton
            onClick={() => this.props.onChangeSectionCount(2)}
            isActive={this.props.renderableCount === 2 && !this.props.isPublishing}>
            <SVG.Columns size="32px" />
          </SmallSquareButton>
        )}
        {this.props.count > 2 && (
          <SmallSquareButton
            onClick={() => this.props.onChangeSectionCount(3)}
            isActive={this.props.renderableCount === 3 && !this.props.isPublishing}>
            <SVG.Three size="32px" />
          </SmallSquareButton>
        )}
        {this.props.count > 3 && (
          <SmallSquareButton
            onClick={() => this.props.onChangeSectionCount(4)}
            isActive={this.props.renderableCount === 4 && !this.props.isPublishing}>
            <SVG.Grid size="32px" />
          </SmallSquareButton>
        )}
      </div>
    );
  }
}
