import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../utils/Colors';

const Playlists = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello this is the Playlists page</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: palette.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Playlists;
