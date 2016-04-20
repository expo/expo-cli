/**
 * This is the entry point for your experience that you will run on Exponent.
 *
 * Start by looking at the render() method of the component called
 * FirstExperience. This is where the text and example components are.
 */
'use strict';

let React = require('react-native');
let {
  Animated,
  AppRegistry,
  Easing,
  Image,
  ScrollView,
  StatusBarIOS,
  StyleSheet,
  Text,
  View,
} = React;

let ExBoxes = require('./ExBoxes');
let ExPhotoGallery = require('./ExPhotoGallery');
let ExScreen = require('./ExScreen');

let HORIZ_SPACE = 12;

class FirstExperience extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      headerColor: '#007aff',
      isBoxPressed: false,
    };
  }

  render() {
    let boxColors = [
      '#5ac8fa', '#ffcc00', '#ff9500', '#ff2d55', '#563b7e', '#007aff',
      '#4cd964', '#ff3b30', '#8e8e93',
    ];

    return (
      <ExScreen
        title="__NAME__"
        headerColor={this.state.headerColor}
        scrollEnabled={!this.state.isBoxPressed}
        style={styles.container}>

        {/* Try editing this text and reloading your project in Exponent */}
        <Text style={styles.paragraph}>
          This is a simple example of what you can make with Exponent. Feel
          free to try modifying it and seeing what happens!
        </Text>

        {/* Photo gallery demo */}
        <Text style={styles.sectionTitle}>Photo Gallery</Text>
        <ExPhotoGallery style={styles.gallery} />

        {/* Bouncy boxes demo */}
        <Text style={styles.sectionTitle}>Interactive Components</Text>
        <ExBoxes
          colors={boxColors}
          onPressBoxBegin={() => this.setState({ isBoxPressed: true })}
          onPressBoxEnd={() => this.setState({ isBoxPressed: false })}
          onSelectColor={this._handleColorSelected.bind(this)}
          style={styles.boxes}
        />
        <Text style={styles.note}>
          Tap the boxes to change the color of the status bar. Press down
          and drag them to see them bounce back with spring physics.
        </Text>

        {/* Publishing instructions */}
        <Text style={styles.sectionTitle}>Publishing</Text>
        <Text style={styles.paragraph}>
          When you are ready to share what your work, run <Text style={styles.code}>exp publish</Text>.
          Give the link to someone who has the Exponent app and they'll be
          able to see what you've built.
        </Text>

        <Text style={styles.attribution}>
          Made for <Text style={styles.exponent}>EXPONENT</Text>
        </Text>
      </ExScreen>
    );
  }

  componentDidMount() {
    if (StatusBarIOS) {
      StatusBarIOS.setStyle('light-content', true);
      StatusBarIOS.setHidden(false, 'fade');
    }
  }

  _handleColorSelected(color) {
    this.setState({ headerColor: color });
  }
}

let styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    color: '#777',
    fontSize: 22,
    fontWeight: '300',
    marginTop: 16,
    marginHorizontal: HORIZ_SPACE,
  },
  paragraph: {
    color: '#000',
    fontSize: 16,
    marginTop: 8,
    marginHorizontal: HORIZ_SPACE,
  },
  note: {
    color: '#333',
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: HORIZ_SPACE,
  },
  code: {
    fontFamily: 'Menlo',
    fontSize: 15,
  },
  gallery: {
    flex: 0,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  boxes: {
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  attribution: {
    color: '#999',
    fontWeight: '300',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 18,
    marginHorizontal: HORIZ_SPACE,
  },
  exponent: {
    color: '#777',
    fontWeight: '200',
    letterSpacing: 3,
  },
});

AppRegistry.registerComponent('main', () => FirstExperience);
