import * as React from 'react';
import * as SVG from 'app/common/svg';

export default props => {
  if (props.type === 'process') {
    return <SVG.Package size="12px" style={props.style} />;
  }

  if (props.type === 'device') {
    return <SVG.Tablet size="12px" style={props.style} />;
  }

  if (props.type === 'simulator') {
    return <SVG.HardDrive size="12px" style={props.style} />;
  }

  if (props.type === 'issues') {
    return <SVG.Warning size="12px" style={props.style} />;
  }

  return <SVG.Logs size="12px" style={props.style} />;
};
