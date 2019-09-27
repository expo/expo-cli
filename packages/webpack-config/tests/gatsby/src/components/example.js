import React from 'react';
import { Text, StyleSheet, View } from 'react-native';

function AspectView(props) {
  const [layout, setLayout] = React.useState(null);

  const { aspectRatio = 1, ...inputStyle } = StyleSheet.flatten(props.style) || {};
  const style = [inputStyle, { aspectRatio }];

  if (layout) {
    const { width = 0, height = 0 } = layout;
    if (width === 0) {
      style.push({ width: height * aspectRatio, height });
    } else {
      style.push({ width, height: width * aspectRatio });
    }
  }

  return (
    <View {...props} style={style} onLayout={({ nativeEvent: { layout } }) => setLayout(layout)} />
  );
}

export default function Example({ title, children, style, row = false }) {
  return (
    <AspectView
      style={[
        {
          margin: 20,
          padding: 10,
          borderWidth: 1,
          borderColor: 'black',
          aspectRatio: 1,
          maxWidth: 560,
          minWidth: 320,
          flex: 1,
          overflow: 'hidden',
        },
      ]}>
      <Text style={{ marginVertical: 10, fontSize: 24 }}>{title}</Text>
      <View
        style={[
          row && {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
          },
          { flex: 1 },
          style,
        ]}>
        {children}
      </View>
    </AspectView>
  );
}
