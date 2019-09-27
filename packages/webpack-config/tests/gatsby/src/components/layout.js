import React from 'react';
import { Text, View } from 'react-native';

export default function Layout({ title, children }) {
  return (
    <View style={{ height: '100vh', overflowY: 'auto' }}>
      <Text
        style={{
          marginVertical: 30,
          marginHorizontal: 10,
          fontSize: 40,
          fontWeight: 'bold',
        }}>
        {title}
      </Text>
      <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>{children}</View>
    </View>
  );
}
