'use strict';

let React = require('react-native');
let {
  Image,
  ScrollView,
  StyleSheet,
  View,
} = React;

let PHOTO_SPACING = 40;

let IMAGE_SOURCES = [
  // hedgehog
  {uri: 'https://i.imgur.com/8049SBB.jpg'},
  // kittens
  {uri: 'https://i.imgur.com/m7DZR1A.jpg'},
  // flower hamsters
  {uri: 'https://i.imgur.com/BeMfZu3.jpg'},
  // puppy
  {uri: 'https://i.imgur.com/ExQom0o.jpg'},
  // duckling
  {uri: 'https://i.imgur.com/cSb7OTE.jpg'},
  // polar bear
  {uri: 'https://i.imgur.com/xlhiPb9.jpg'},
];

class ExPhotoGallery extends React.Component {
  render() {
    return (
      <ScrollView
        horizontal
        scrollsToTop={false}
        automaticallyAdjustContentInsets={false}
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        style={[styles.container, this.props.style]}>
        {IMAGE_SOURCES.map(source =>
          this._renderPhoto(source, { width: 320, height: 240 })
        )}
      </ScrollView>
    );
  }

  _renderPhoto(source, size) {
    return (
      <View key={source.uri} style={styles.photoContainer}>
        <Image source={source} style={[styles.photo, size]} />
      </View>
    );
  }
}

let styles = StyleSheet.create({
  container: {
    flex: 0,
    width: 320 + PHOTO_SPACING,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 12,
    overflow: 'visible',
  },
  photoContainer: {
    marginHorizontal: PHOTO_SPACING / 2,
    overflow: 'visible',
    shadowRadius: 3,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 1 },
  },
  photo: {
    overflow: 'visible',
  },
});

module.exports = ExPhotoGallery;
