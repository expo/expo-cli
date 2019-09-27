import './layout.css';

import React from 'react';
import { Text, View } from 'react-native';

const Layout = ({ title, children }) => (
  <View style={{ height: '100vh', overflowY: 'auto' }}>
    <View>
      <Text
        style={{
          marginVertical: 30,
          marginHorizontal: 10,
          fontSize: 40,
          fontWeight: 'bold',
        }}>
        {title}
      </Text>
    </View>
    {children}
  </View>
);

export default Layout;
