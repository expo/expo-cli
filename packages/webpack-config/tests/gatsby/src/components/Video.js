import React from 'react';
import { PixelRatio, Text, ScrollView, StyleSheet } from 'react-native';
import VideoPlayer from './VideoPlayer';

const HeadingText = Text;

export default class VideoScreen extends React.Component {
  static navigationOptions = {
    title: 'Video',
  };

  render() {
    return (
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <HeadingText>HTTP player</HeadingText>
        <VideoPlayer source={{ uri: 'http://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4' }} />
      </ScrollView>
    );
  }
  //   <HeadingText>Local asset player</HeadingText>
  //         <VideoPlayer source={require('../../../assets/videos/ace.mp4')} />
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 10,
  },
  player: {
    borderBottomWidth: 1.0 / PixelRatio.get(),
    borderBottomColor: '#cccccc',
  },
});
