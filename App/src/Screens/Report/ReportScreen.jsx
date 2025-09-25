 
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  useColorScheme,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import apiClient from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestCameraPermission,
  requestMediaPermission,
  requestLocationPermission,
} from '../../api/permissions';
import Geolocation from '@react-native-community/geolocation';

// Color definitions
const lightThemeColors = {
  text: '#0d0c0cff',
  placeholder: '#A9A9A9',
  icon: '#333333',
};

const darkThemeColors = {
  text: '#000000',
  placeholder: '#666666',
  icon: '#333333',
};

const ReportScreen = ({ navigation }) => {
  const [incidentType, setIncidentType] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null); // Store actual coordinates

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkThemeColors : lightThemeColors;

  // Removed automatic location fetch - now only triggered by user button press
  
  // Convert coordinates to place name using reverse geocoding
  const getPlaceName = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyCUxXNHEhHK49xX6_2ALNDzg1ctntetw08`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Get the most relevant address (usually the first one)
        const address = data.results[0].formatted_address;
        return address;
      } else {
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    } catch (error) {
      console.log('Geocoding error:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  // Get device location when user clicks the GPS button (using quick/low accuracy method)
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      // First check if location services are enabled
      const granted = await requestLocationPermission();
      
      if (!granted) {
        setLocationLoading(false);
        Alert.alert(
          'Permission Required', 
          'Please enable location permission in your device settings to use this feature. You can still enter the location manually.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
        return;
      }

      Geolocation.getCurrentPosition(
        async pos => {
          const { latitude, longitude } = pos.coords;
          // Store coordinates for backend
          setLocationCoords({ latitude, longitude });
          
          // Get place name for display
          const placeName = await getPlaceName(latitude, longitude);
          setLocation(placeName);
          setLocationLoading(false);
          Alert.alert('Success', 'Current location has been added to your report.');
        },
        error => {
          console.log('Location error:', error);
          setLocationLoading(false);
          let errorMessage = 'Unable to fetch location. ';
          
          switch (error.code) {
            case 1:
              errorMessage = 'Location permission was denied. Please enable location permission in your device settings.';
              break;
            case 2:
              errorMessage = 'Location services are currently unavailable. Please check that location services are enabled on your device.';
              break;
            case 3:
              errorMessage = 'Location request timed out. Please try again or enter the location manually.';
              break;
            default:
              errorMessage = 'Unable to get your location. Please try again or enter the location manually.';
          }
          
          Alert.alert(
            'Location Error', 
            errorMessage,
            [
              { text: 'Try Again', onPress: getCurrentLocation },
              { text: 'Enter Manually', style: 'cancel' }
            ]
          );
        },
        { 
          enableHighAccuracy: false,  // Use quick location (lower accuracy but faster)
          timeout: 10000,             // Short timeout
          maximumAge: 120000          // Allow cached location up to 2 minutes
        },
      );
    } catch (error) {
      console.error('Error in getCurrentLocation:', error);
      setLocationLoading(false);
      Alert.alert('Error', 'Failed to get location. You can enter it manually.');
    }
  };


  // Open image gallery
  const handleChoosePhoto = async () => {
    const granted = await requestMediaPermission();
    if (!granted) {
      Alert.alert('Permission Denied', 'Storage permission is required.');
      return;
    }

    launchImageLibrary({ mediaType: 'photo' }, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        setImage(response.assets[0]);
      }
    });
  };

  // Submit report
  const handleSubmit = async () => {
    if (!description || !incidentType || !location) {
      return Alert.alert(
        'Missing Information',
        'Please fill out all fields before submitting.',
      );
    }
    setLoading(true);

    const token = await AsyncStorage.getItem('user_token');
    const formData = new FormData();

    formData.append('incidentType', incidentType);
    // Send coordinates to backend, or location text if manually entered
    if (locationCoords) {
      formData.append('location', `${locationCoords.latitude}, ${locationCoords.longitude}`);
      formData.append('locationName', location); // Also send place name for reference
    } else {
      formData.append('location', location); // Manual entry
    }
    formData.append('description', description);

    if (image) {
      formData.append('image', {
        uri: image.uri,
        type: image.type,
        name: image.fileName,
      });
    }

    try {
      await apiClient.post('/reports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      Alert.alert('Success', 'Report submitted successfully!');
      setIncidentType('');
      setLocation('');
      setDescription('');
      setImage(null);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to submit report:', error.response?.data || error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={theme.icon} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Report an Accident
          </Text>
          <TouchableOpacity onPress={() => getCurrentLocation()}>
            <Icon name="crosshairs-gps" size={24} color={theme.icon} />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.label, { color: theme.text }]}>
            Incident Type
          </Text>
          <TextInput
            style={[styles.inputContainer, { color: theme.text }]}
            value={incidentType}
            onChangeText={setIncidentType}
            placeholder="e.g., Bus Breakdown, Traffic Jam"
            placeholderTextColor={theme.placeholder}
          />

          <Text style={[styles.label, { color: theme.text }]}>Location</Text>
          <View style={styles.locationInputContainer}>
            <TextInput
              style={[styles.locationInput, { color: theme.text }]}
              value={location}
              onChangeText={(text) => {
                setLocation(text);
                // Clear coordinates when user manually edits
                if (locationCoords) {
                  setLocationCoords(null);
                }
              }}
              placeholder="Location of incident or tap GPS to get current location"
              placeholderTextColor={theme.placeholder}
              multiline
            />
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <Icon name="crosshairs-gps" size={20} color="#4285F4" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Description</Text>
          <TextInput
            style={[
              styles.inputContainer,
              styles.descriptionInput,
              { color: theme.text },
            ]}
            placeholder="Describe the incident..."
            placeholderTextColor={theme.placeholder}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Upload Media
          </Text>
          <TouchableOpacity
            style={styles.mediaUploader}
            onPress={handleChoosePhoto}
          >
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
            ) : (
              <>
                <Icon name="cloud-upload-outline" size={30} color="#888" />
                <Text style={[styles.uploaderText, { color: colorScheme === 'dark' ? '#cccccc' : '#555' }]}>Tap to upload a photo</Text>
                <Text style={[styles.optionalText, { color: colorScheme === 'dark' ? '#aaaaaa' : 'gray' }]}>Optional</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  inputContainer: {
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    marginBottom: 20,
    minHeight: 50,
  },
  locationInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  locationButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    marginLeft: 5,
  },
  descriptionInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  mediaUploader: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDFDFD',
    minHeight: 150,
  },
  uploaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  optionalText: {
    marginTop: 5,
    fontSize: 12,
    color: 'gray',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  submitButton: {
   
    backgroundColor: '#4285F4',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    resizeMode: 'cover',
  },
});

export default ReportScreen;
