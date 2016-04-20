'use strict';

let React = require('react-native');
let {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  View,
} = React;

let BOX_LENGTH = 88;
let BOX_SPACING = 12;
let PAN_THRESHOLD = 10;
let PAN_STIFFNESS = 1.2;

class ExBoxes extends React.Component {
  render() {
    let { colors, ...props } = this.props;
    return (
      <View {...props} style={[styles.container, props.style]}>
        {this.props.colors.map(color =>
          <Box
            key={color}
            color={color}
            onSelect={() => this.props.onSelectColor(color)}
            onPressBegin={this.props.onPressBoxBegin}
            onPressEnd={this.props.onPressBoxEnd}
          />
        )}
      </View>
    );
  }
}

class Box extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      scale: new Animated.Value(1),
      position: new Animated.ValueXY(0, 0),
      panResponder: PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: this._handlePanGrant.bind(this),
        onPanResponderMove: this._handlePanMove.bind(this),
        onPanResponderRelease: this._handlePanRelease.bind(this),
        onPanResponderTerminate: this._handlePanTerminate.bind(this),
      }),
      isPressed: false,
      isPanning: false,
    };
  }

  _handlePanGrant(event, gestureState) {
    Animated.spring(this.state.scale, {
      toValue: 0.95,
      tension: 300,
      friction: 20,
    }).start(result => {
      if (result.finished && !this.state.isPressed && this.props.onPressBegin) {
        this.setState({ isPressed: true });
        this.props.onPressBegin();
      }
    });
  }

  _handlePanMove(event, gestureState) {
    let { dx, dy } = gestureState;
    if (!this.state.isPanning) {
      if (distance(dx, dy) <= PAN_THRESHOLD) {
        return;
      }
      this.setState({ isPanning: true });
      this.state.position.setOffset({
        x: -dx / PAN_STIFFNESS,
        y: -dy / PAN_STIFFNESS,
      });
    }
    this.state.position.setValue({
      x: dx / PAN_STIFFNESS,
      y: dy / PAN_STIFFNESS,
    });
  }

  _handlePanRelease(event, gestureState) {
    if (!this.state.isPanning && this.props.onSelect) {
      this.props.onSelect();
    }
    this._restore();
  }

  _handlePanTerminate(event, gestureState) {
    this._restore();
  }

  _restore() {
    Animated.spring(this.state.scale, {
      toValue: 1,
      tension: 150,
      friction: 5,
    }).start();

    if (this.state.isPanning) {
      this.state.position.flattenOffset();
      Animated.spring(this.state.position, {
        toValue: { x: 0, y: 0 },
        tension: 150,
        friction: 8,
      }).start();
      this.setState({ isPanning: false });
    }

    if (this.state.isPressed) {
      this.setState({ isPressed: false });
      if (this.props.onPressEnd) {
        this.props.onPressEnd();
      }
    }
  }

  render() {
    return (
      <Animated.View
        {...this.state.panResponder.panHandlers}
        style={[
          styles.box,
          { backgroundColor: this.props.color },
          {
            transform: [
              { scale: this.state.scale },
              ...this.state.position.getTranslateTransform(),
            ]
          },
        ]}
      />
    );
  }
}

function distance(x, y) {
  return Math.sqrt(x * x + y * y);
}

let styles = StyleSheet.create({
  container: {
    width: BOX_LENGTH * 3 + BOX_SPACING * 2,
    height: BOX_LENGTH * 3 + BOX_SPACING * 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  box: {
    width: BOX_LENGTH,
    height: BOX_LENGTH,
    marginBottom: BOX_SPACING,
  },
});

module.exports = ExBoxes;
