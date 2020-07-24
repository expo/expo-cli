import * as SVG from 'app/common/svg';
import * as React from 'react';

export default props => {
  if (props.type === 'Process') {
    return <SVG.Package size="12px" style={props.style} />;
  }

  if (props.type === 'Device') {
    return <SVG.Tablet size="12px" style={props.style} />;
  }

  if (props.type === 'Issues') {
    return <SVG.Warning size="12px" style={props.style} />;
  }

  return <SVG.Logs size="12px" style={props.style} />;
};
