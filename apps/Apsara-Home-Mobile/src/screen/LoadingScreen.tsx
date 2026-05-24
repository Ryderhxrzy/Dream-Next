import React from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export default function LoadingScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/home_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Affordahome</Text>
      </View>
      <ActivityIndicator size="large" color={Colors.sky} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  loader: {
    position: 'absolute',
    bottom: 80,
  }
});
