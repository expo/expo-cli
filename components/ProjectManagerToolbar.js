import styled, { css } from 'react-emotion';

import * as React from 'react';
import * as SVG from 'app/common/svg';

import SmallButton from 'app/components/SmallButton';

export default class ProjectManagerToolbar extends React.Component {
  render() {
    return (
      <div>
        {this.props.count > 1 && (
          <SmallButton
            onClick={() => this.props.onChangeSelectionCount(1)}
            isActive={this.props.renderableCount === 1}>
            <SVG.One size="16px" />
          </SmallButton>
        )}
        {this.props.count > 1 && (
          <SmallButton
            onClick={() => this.props.onChangeSelectionCount(2)}
            isActive={this.props.renderableCount === 2}>
            <SVG.Columns size="16px" />
          </SmallButton>
        )}
        {this.props.count > 2 && (
          <SmallButton
            onClick={() => this.props.onChangeSelectionCount(3)}
            isActive={this.props.renderableCount === 3}>
            <SVG.Three size="16px" />
          </SmallButton>
        )}
        {this.props.count > 3 && (
          <SmallButton
            onClick={() => this.props.onChangeSelectionCount(4)}
            isActive={this.props.renderableCount === 4}>
            <SVG.Grid size="16px" />
          </SmallButton>
        )}
      </div>
    );
  }
}
