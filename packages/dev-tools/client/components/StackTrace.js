import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Constants from 'app/common/constants';
import { semanticColors } from 'app/common/colors';

export default class StackTrace extends React.Component {
  render() {
    let lines = this.props.stack.split(/\r?\n/);
    if (/^node_modules\/react-native\/Libraries\/ReactNative\/YellowBox\.js/.test(lines[0])) {
      lines.shift();
    }
    if (/^node_modules\/expo\/src\/Expo\.js:.+ in warn/.test(lines[0])) {
      lines.shift();
    }

    const frames = lines.map(line => `  ${line}\n`);

    return !this.props.collapsed ? (
      <View style={styles.container}>
        <Text style={styles.text}>
          {'\n'}Stack trace:{'\n'}
        </Text>
        <Text style={styles.text}>{frames}</Text>
      </View>
    ) : null;
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  text: {
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    fontFamily: Constants.fontFamilies.mono,
    fontSize: 12,
    lineHeight: 14,
    color: semanticColors.logContent,
  },
});
