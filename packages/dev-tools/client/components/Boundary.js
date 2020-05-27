import * as React from 'react';

export default class Boundary extends React.PureComponent {
  static defaultProps = {
    className: undefined,
    captureResize: true,
    captureScroll: true,
    children: null,
    enabled: false,
    onOutsideRectEvent: () => {},
  };

  _root;

  componentDidMount() {
    if (!this.props.enabled) {
      return;
    }

    this._addListeners();
  }

  componentWillUnmount() {
    this._removeListeners();
  }

  componentWillReceiveProps(props) {
    if (props.enabled) {
      this._addListeners();
    } else {
      this._removeListeners();
    }
  }

  _addListeners = () => {
    this._removeListeners();

    window.setTimeout(() => {
      if (this.props.onOutsideRectEvent) {
        window.addEventListener('click', this._handleOutsideClick);
      }
      if (this.props.captureResize) {
        window.addEventListener('resize', this._handleWindowResize);
      }
      if (this.props.captureScroll) {
        window.addEventListener('scroll', this._handleWindowScroll);
      }
    });
  };

  _handleOutsideClick = e => {
    if (this._root && !this._root.contains(e.target)) {
      this._handleOutsideRectEvent(e);
    }
  };

  _handleWindowResize = e => this._handleOutsideRectEvent(e);
  _handleWindowScroll = e => this._handleOutsideRectEvent(e);

  _removeListeners = () => {
    window.removeEventListener('click', this._handleOutsideClick);
    window.removeEventListener('resize', this._handleWindowResize);
    window.removeEventListener('scroll', this._handleWindowScroll);
  };

  _handleOutsideRectEvent = e => {
    this.props.onOutsideRectEvent(e);
  };

  render() {
    return (
      <div
        className={this.props.className}
        ref={c => {
          this._root = c;
        }}
        style={this.props.style}
        onClick={this.props.onClick}>
        {this.props.children}
      </div>
    );
  }
}
