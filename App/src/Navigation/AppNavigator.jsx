// src/Navigation/AppNavigator.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import all your screens
import LandingScreen from '../Screens/LandingScreen';
import LoginScreen from '../Screens/Login_Signup/LoginScreen';
import SignupScreen from '../Screens/Login_Signup/SignupScreen';
import HomeSearch from '../Screens/Home/HomeSearch'; // Assuming HomeSearch is your HomeScreen
import SearchResultsScreen from '../Screens/SearchResults/SearchResultScreen';
import RouteTimelineScreen from '../Screens/RouteTimeline/RouteTimelineScreen';
import NotificationScreen from '../Screens/Notifications/NotificationScreen';
import ReportScreen from '../Screens/Report/ReportScreen';
import ProfileScreen from '../Screens/Profile/ProfileScreen';
import ChatBotScreen from '../Screens/ChatBot/ChatBotScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- AUTHENTICATION STACK ---
// This stack handles the flow BEFORE the user is logged in.
const AuthStack = ({ onLogin }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Landing" component={LandingScreen} />
    {/* Use a render prop for LoginScreen to pass down the onLogin function */}
    <Stack.Screen name="Login">
      {props => <LoginScreen {...props} onLogin={onLogin} />}
    </Stack.Screen>
   <Stack.Screen name="Signup">
      {props => <SignupScreen {...props} onLogin={onLogin} />}
    </Stack.Screen>
  </Stack.Navigator>
);

// --- HOME STACK ---
// This is a nested stack for the "Home" tab.
// It allows you to navigate from HomeScreen to SearchResultsScreen and ChatBot.
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeSearch} />
    <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
    <Stack.Screen name="RouteTimeline" component={RouteTimelineScreen} />
    <Stack.Screen name="ChatBot" component={ChatBotScreen} />
  </Stack.Navigator>
);

// --- MAIN TAB NAVIGATOR ---
// This is the main navigator for when the user IS logged in.
const MainTabs = ({onLogout}) => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#8E4DFF',
      tabBarHideOnKeyboard: true, 
      tabBarInactiveTintColor: 'gray',
      tabBarIcon: ({ color, size }) => {
        const icons = {
          Home: 'home-variant',
          Notifications: 'bell-outline',
          Report: 'alert-octagon',
          Profile: 'account-circle-outline',
        };
        return <Icon name={icons[route.name]} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeStack} />
    <Tab.Screen name="Notifications" component={NotificationScreen} />
    <Tab.Screen name="Report" component={ReportScreen} />
    <Tab.Screen name="Profile">
      {props => <ProfileScreen {...props} onLogout={onLogout} />}
    </Tab.Screen>
  </Tab.Navigator>
);

// --- ROOT NAVIGATOR ---
// This is the main component that decides which stack to show.
const AppNavigator = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on app startup
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token');
        if (token) {
          // Token exists, user should be logged in
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Create the functions to change the login state
  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user_token');
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F2F1' }}>
        <ActivityIndicator size="large" color="#8E4DFF" />
        <Text style={{ marginTop: 10, fontSize: 16, color: '#555' }}>Loading...</Text>
      </View>
    );
  }

  return (
    // Pass the handleLogin function to the AuthStack
    <>{isLoggedIn ? <MainTabs onLogout={handleLogout} /> : <AuthStack onLogin={handleLogin} />}</>
  );
};

export default AppNavigator;