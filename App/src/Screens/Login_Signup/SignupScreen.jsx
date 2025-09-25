import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 1. Import AsyncStorage

// Color definitions (self-contained)
const lightThemeColors = {
  text: '#333333',
  placeholder: '#A9A9A9',
};
const darkThemeColors = {
  text: '#0f0c0cff',
  placeholder: '#757575',
};

const SignupScreen = ({ navigation, onLogin }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkThemeColors : lightThemeColors;


  // 2. Updated handleSignup function with auto-login logic
  const handleSignup = async () => {
    setError('');
    setLoading(true);
    const userDetails = {
      name: name.trim(),
      mobile: mobile.trim(),
      age: age.trim() === '' ? undefined : age.trim(),
      email: email.trim() === '' ? undefined : email.trim(),
      password: password,
    };
    
    console.log('📤 Sending signup data:', {
      ...userDetails,
      password: '***'
    });

    try {
      // Step 1: Create the new user account
      await apiClient.post('/auth/signup', userDetails);
      console.log('Signup successful, now logging in...');

      // Step 2: Automatically log in to get the token
      const loginResponse = await apiClient.post('/auth/login', {
        mobile: mobile,
        password: password,
      });
      
      const token = loginResponse.data.token;

      // Step 3: Save the token to storage
      await AsyncStorage.setItem('user_token', token);
      console.log('Token saved after signup');
      
      // Step 4: Switch to the main app
      onLogin();

    } catch (err) {
      console.error('🚨 Signup Error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      const errorMessage = err.response?.data?.message || 'An unexpected error occurred.';
      const detailedErrors = err.response?.data?.errors;
      
      if (detailedErrors) {
        console.log('🔍 Detailed validation errors:', detailedErrors);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          {/* 3. Changed to use goBack() for better navigation */}
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Image
            source={require('../../Assets/Profile/avatarLogin.png')}
            style={styles.avatar}
          />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Name"
            value={name}
            placeholderTextColor={theme.placeholder}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Mobile"
            value={mobile}
            onChangeText={setMobile}
            placeholderTextColor={theme.placeholder}
            keyboardType="phone-pad"
            maxLength={10}
          />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Age"
            value={age}
            onChangeText={setAge}
            placeholderTextColor={theme.placeholder}
            keyboardType="number-pad"
          />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={theme.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={theme.placeholder}
            secureTextEntry
          />
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign up now</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
        
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F2F1',
  },
  header: {
    padding: 20,
    alignItems: 'flex-start',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 30,
    backgroundColor: '#E0E0E0',
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginBottom: 15,
    fontSize: 16,
    elevation: 2,
  },
  signupButton: {
    width: '100%',
    backgroundColor: '#8E4DFF',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default SignupScreen;