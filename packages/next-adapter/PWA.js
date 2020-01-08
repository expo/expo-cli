import * as React from 'react';

// To work with the iPhone X "notch" add `viewport-fit=cover` to the `viewport` meta tag.
const DEFAULT_VIEWPORT =
  'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1.00001,viewport-fit=cover';

class PWA extends React.Component {
  render() {
    return [
      this.props.themeColor && <meta name="theme-color" content={this.props.themeColor} />,
      <meta name="viewport" content={this.props.viewport || DEFAULT_VIEWPORT} />,
      <link rel="manifest" href={this.props.manifestPath || '/static/manifest.json'} />,
    ];
  }
}

export default PWA;
