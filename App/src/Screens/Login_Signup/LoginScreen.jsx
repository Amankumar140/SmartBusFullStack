import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client'; // 1. Import the API client
import AsyncStorage from '@react-native-async-storage/async-storage'; // 2. Import AsyncStorage

const lightThemeColors = {
  text: '#333333',
  placeholder: '#050404ff',
};

const darkThemeColors = {
  text: '#100c0cff',
  placeholder: '#757575',
};



const LoginScreen = ({ navigation, onLogin }) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState(''); // 3. State for the password input
  const [error, setError] = useState('');       // 4. State for displaying errors

    const colorScheme = useColorScheme();
    const theme = colorScheme === 'dark' ? darkThemeColors : lightThemeColors;
  const handleLogin = async () => {
    setError(''); // Clear previous errors
    if (!mobileNumber || !password) {
      return setError('Please provide mobile number and password.');
    }

    try {
      // 5. Make a POST request to the backend's login endpoint
      const response = await apiClient.post('/auth/login', {
        mobile: mobileNumber,
        password: password,
      });

      // 6. Extract the token from the response
      const token = response.data.token;
      
      // 7. Save the token securely to the device's storage
      await AsyncStorage.setItem('user_token', token);
      console.log('Token saved successfully');
      
      // 8. If login succeeds, call onLogin to switch to the main app
      onLogin();

    } catch (err) {
      // 9. If the API call fails, catch the error
      const errorMessage = err.response?.data?.message || 'Invalid credentials or server error.';
      console.error('Login failed:', errorMessage);
      setError(errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Landing')}>
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Image
            source={require('../../Assets/Profile/avatarLogin.png')}
            style={styles.avatar}
          />

          <View style={styles.inputGroup}>
            <View style={styles.mobileInputContainer}>
              <Text style={styles.countryCode}>+91 |</Text>
              <TextInput
                style={[styles.mobileInput , {color:theme.text}]}
                placeholder="Mobile"
                placeholderTextColor={theme.placeholder}
                keyboardType="phone-pad"
                value={mobileNumber}
                onChangeText={setMobileNumber}
                maxLength={10}
              />
            </View>

            {/* 10. Added a new password input field */}
            <TextInput
              style={[styles.input,{color:theme.text}]}
              placeholder="Password"
              placeholderTextColor={theme.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry // This hides the password characters
            />
            
            {/* 11. Conditionally display an error message */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.signupLinkContainer}>
          <Text style={styles.signupText}>don't have account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupLink}>&rarr; signup</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ... copy the full styles object from your original file ...
// Make sure to add/update these styles:
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F2F1',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 40,
    backgroundColor: '#E0E0E0',
  },
  inputGroup: {
    width: '90%',
    alignItems: 'center',
  },
  mobileInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15, // Reduced margin
    height: 55,
    elevation: 2,
  },
  countryCode: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
    fontWeight: 'bold',
  },
  mobileInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  input: { // A new generic style for inputs like Password
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    height: 55,
    elevation: 2,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#8E4DFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10, // Added margin
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 30,
  },
  signupText: {
    fontSize: 16,
    color: '#555',
  },
  signupLink: {
    fontSize: 16,
    color: '#8E4DFF',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default LoginScreen;