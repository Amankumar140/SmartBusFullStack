 


import React from 'react';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LandingScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Fullscreen background image */}
      <ImageBackground
        source={require('../Assets/LandingPage/landingPage.png')} // replace with your background image
        style={styles.background}
        resizeMode="cover"
      >
        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.getStartedButtonText}>Get Started</Text>
        </TouchableOpacity>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // fallback color while image loads
  },
  background: {
    flex: 1,
    justifyContent: 'flex-end', // places button near the bottom
    alignItems: 'center',
  },
  getStartedButton: {
    marginBottom: 80,
    width: '60%',
    backgroundColor: '#8E4DFF',
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LandingScreen;
