import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';

const ProfileScreen = ({ navigation, onLogout }) => {
  // State to hold user profile data fetched from the API
  const [user, setUser] = useState(null);
  // State to show a loading spinner while data is being fetched
  const [loading, setLoading] = useState(true);

  // Fetch profile data when the screen loads
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token');
        if (!token) {
          setLoading(false);
          return;
        }

        // Make the authenticated API call to get the user's profile
        const response = await apiClient.get('/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(response.data); // Save the fetched user data to state
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false); // Stop the loading spinner
      }
    };

    fetchProfile();
  }, []); // The empty array [] means this runs only once when the screen loads

  // Show a loading spinner while fetching data
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8E4DFF" />
      </SafeAreaView>
    );
  }

  // Show a message if the user data couldn't be loaded
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text>Could not load profile. Please try logging in again.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Info - Now uses live data from the server */}
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <Image
              source={require('../../Assets/Profile/userProfile.png')}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.editIconContainer}>
              <Icon name="pencil" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{`${user.name} | ${user.age}`}</Text>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => console.log('Manage Account')}
          >
            <Icon
              name="account-outline"
              size={24}
              color="#555"
              style={styles.settingIcon}
            />
            <Text style={styles.settingText}>Manage Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => console.log('Privacy & Security')}
          >
            <Icon
              name="shield-lock-outline"
              size={24}
              color="#555"
              style={styles.settingIcon}
            />
            <Text style={styles.settingText}>Privacy & Security</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => console.log('App Preferences')}
          >
            <Icon
              name="cog-outline"
              size={24}
              color="#555"
              style={styles.settingIcon}
            />
            <Text style={styles.settingText}>App Preferences</Text>
          </TouchableOpacity>
        </View>

        {/* Help & Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => console.log('Help & FAQs')}
          >
            <Text style={styles.buttonText}>Help & FAQs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => console.log('Contact Transport Authority')}
          >
            <Text style={styles.buttonText}>Contact Transport Authority</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF6F61',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    resizeMode: 'contain',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#7B61FF',
    borderRadius: 15,
    padding: 5,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIcon: {
    marginRight: 15,
    color: '#333',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
  },
});

export default ProfileScreen;