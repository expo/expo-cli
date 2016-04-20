'use strict';

let React = require('react-native');
let {
  Animated,
  ScrollView,
  StyleSheet,
  View,
} = React;

let ExHeader = require('./ExHeader');

const STATUS_BAR_HEIGHT = 20;

class ExScreen extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      headerScale: new Animated.Value(1),
      scrollDistance: new Animated.Value(0),
    };
  }

  render() {
    let {
      title,
      headerColor,
      scrollEnabled,
      ...props,
    } = this.props;

    return (
      <View {...props}>
        <ScrollView
          ref={component => { this._scrollView = component; }}
          contentContainerStyle={styles.contentContainer}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={this._handleScroll.bind(this)}>
          <View style={{ height: ExHeader.HEIGHT + STATUS_BAR_HEIGHT }} />
          {props.children}
        </ScrollView>
        <ExHeader
          title={title}
          scrollDistance={this.state.scrollDistance}
          style={[styles.header, { backgroundColor: headerColor }]}
        />
      </View>
    );
  }

  _handleScroll(event) {
    let {
      contentInset: { top: topInset },
      contentOffset: { y: scrollY },
    } = event.nativeEvent;
    let scrollDistance = scrollY + topInset;
    this.state.scrollDistance.setValue(scrollDistance);
  }
}

let styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});

module.exports = ExScreen;
