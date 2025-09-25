import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const HomeSearch = ({ navigation }) => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [routeLocations, setRouteLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);

  // Mock route locations data for fallback (route sources and destinations)
  const mockRouteLocations = [
    { stop_id: 'location_Chandigarh', stop_name: 'Chandigarh', location: 'Chandigarh', region: 'Chandigarh' },
    { stop_id: 'location_Ludhiana', stop_name: 'Ludhiana', location: 'Ludhiana', region: 'Ludhiana' },
    { stop_id: 'location_Amritsar', stop_name: 'Amritsar', location: 'Amritsar', region: 'Amritsar' },
    { stop_id: 'location_Jalandhar', stop_name: 'Jalandhar', location: 'Jalandhar', region: 'Jalandhar' },
    { stop_id: 'location_Patiala', stop_name: 'Patiala', location: 'Patiala', region: 'Patiala' },
    { stop_id: 'location_Mohali', stop_name: 'Mohali', location: 'Mohali', region: 'Mohali' },
    { stop_id: 'location_Phagwara', stop_name: 'Phagwara', location: 'Phagwara', region: 'Phagwara' },
    { stop_id: 'location_Kurukshetra', stop_name: 'Kurukshetra', location: 'Kurukshetra', region: 'Kurukshetra' },
    { stop_id: 'location_Delhi', stop_name: 'Delhi', location: 'Delhi', region: 'Delhi' },
    { stop_id: 'location_Jaipur', stop_name: 'Jaipur', location: 'Jaipur', region: 'Jaipur' },
  ];

  // Fetch route locations from database with fallback
  useEffect(() => {
    const fetchRouteLocations = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token');
        if (!token) {
          console.log('No token found, using mock route locations');
          setRouteLocations(mockRouteLocations);
          return;
        }

        console.log('📡 Fetching route locations from API...');
        const response = await apiClient.get('/buses/route-locations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.data && response.data.stops && response.data.stops.length > 0) {
          setRouteLocations(response.data.stops);
          console.log('✅ Successfully fetched', response.data.stops.length, 'route locations from API');
        } else {
          console.log('⚠️ API returned no locations, using mock data');
          setRouteLocations(mockRouteLocations);
        }
      } catch (error) {
        console.error('❌ Failed to fetch route locations:');
        console.error('  Error message:', error.message);
        console.error('  Status:', error.response?.status);
        console.error('  Response data:', error.response?.data);
        console.log('🔄 Using mock route locations as fallback');
        setRouteLocations(mockRouteLocations);
      }
    };

    fetchRouteLocations();
  }, []);

  // Filter suggestions based on input
  const filterSuggestions = (text, type) => {
    if (!text || text.length < 1) {
      if (type === 'source') {
        setSourceSuggestions([]);
        setShowSourceSuggestions(false);
      } else {
        setDestSuggestions([]);
        setShowDestSuggestions(false);
      }
      return;
    }

    const filtered = routeLocations.filter(stop => {
      // Safely check each field for null/undefined before calling toLowerCase
      const stopName = stop.stop_name || '';
      const location = stop.location || '';
      const region = stop.region || '';
      
      return stopName.toLowerCase().includes(text.toLowerCase()) ||
             location.toLowerCase().includes(text.toLowerCase()) ||
             region.toLowerCase().includes(text.toLowerCase());
    }).slice(0, 5); // Limit to 5 suggestions

    if (type === 'source') {
      setSourceSuggestions(filtered);
      setShowSourceSuggestions(filtered.length > 0);
    } else {
      setDestSuggestions(filtered);
      setShowDestSuggestions(filtered.length > 0);
    }
  };

  const handleSourceChange = (text) => {
    setSource(text);
    filterSuggestions(text, 'source');
  };

  const handleDestChange = (text) => {
    setDestination(text);
    filterSuggestions(text, 'destination');
  };

  const selectSuggestion = (stop, type) => {
    const stopName = stop.stop_name || 'Unknown Stop';
    if (type === 'source') {
      setSource(stopName);
      setShowSourceSuggestions(false);
    } else {
      setDestination(stopName);
      setShowDestSuggestions(false);
    }
  };

  const handleSearch = async () => {
    if (!source || !destination) {
      alert('Please enter both source and destination.');
      return;
    }
    
    if (source && destination && source.toLowerCase() === destination.toLowerCase()) {
      alert('Source and destination cannot be the same.');
      return;
    }

    setLoading(true);
    
    // Hide suggestions
    setShowSourceSuggestions(false);
    setShowDestSuggestions(false);
    
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('SearchResults', {
        source: source.trim(),
        destination: destination.trim(),
      });
    }, 500);
  };

  const renderSuggestion = ({ item, type }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => selectSuggestion(item, type)}
    >
      <Icon name="map-marker" size={16} color="#8E4DFF" />
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionTitle}>{item.stop_name || 'Unknown Stop'}</Text>
        <Text style={styles.suggestionSubtitle}>
          {[item.location, item.region].filter(Boolean).join(', ') || 'Location not specified'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SmartBus</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.profileIconContainer}>
            <Image
              source={require('../../Assets/Profile/avatarLogin.png')}
              style={styles.profileImage}
            />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>🚍  Where are you going?</Text>
          
          {/* Source Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>FROM</Text>
            <View style={styles.inputWrapper}>
              <Icon name="map-marker-outline" size={20} color="#8E4DFF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter source city (e.g., Chandigarh, Delhi)"
                placeholderTextColor="#A9A9A9"
                value={source}
                onChangeText={handleSourceChange}
                onFocus={() => source && filterSuggestions(source, 'source')}
              />
            </View>
            {/* Source Suggestions */}
            {showSourceSuggestions && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={sourceSuggestions}
                  renderItem={({ item }) => renderSuggestion({ item, type: 'source' })}
                  keyExtractor={(item) => `source-${item.stop_id}`}
                  style={styles.suggestionsList}
                />
              </View>
            )}
          </View>

          {/* Destination Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>TO</Text>
            <View style={styles.inputWrapper}>
              <Icon name="map-marker" size={20} color="#FF6B6B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter destination city (e.g., Ludhiana, Amritsar)"
                placeholderTextColor="#A9A9A9"
                value={destination}
                onChangeText={handleDestChange}
                onFocus={() => destination && filterSuggestions(destination, 'destination')}
              />
            </View>
            {/* Destination Suggestions */}
            {showDestSuggestions && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={destSuggestions}
                  renderItem={({ item }) => renderSuggestion({ item, type: 'destination' })}
                  keyExtractor={(item) => `dest-${item.stop_id}`}
                  style={styles.suggestionsList}
                />
              </View>
            )}
          </View>

          {/* Search Button */}
          <TouchableOpacity 
            style={[styles.searchButton, loading && styles.searchButtonDisabled]} 
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon name="magnify" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.searchButtonText}>Find Buses</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Quick Search Buttons */}
          <View style={styles.quickSearchContainer}>
            <Text style={styles.quickSearchTitle}>Popular Routes:</Text>
            <View style={styles.quickSearchButtons}>
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => {
                  setSource('Chandigarh');
                  setDestination('Ludhiana');
                }}
              >
                <Text style={styles.quickButtonText}>Chandigarh ↔ Ludhiana</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => {
                  setSource('Ludhiana');
                  setDestination('Amritsar');
                }}
              >
                <Text style={styles.quickButtonText}>Ludhiana ↔ Amritsar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.taglineContainer}>
          <Text style={styles.taglineTitle}> Never miss your Bus again </Text>
          <Text style={styles.taglineSubtitle}> Apka Safar Sarthi</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.chatbotButton}
        onPress={() => navigation.navigate('ChatBot')}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../Assets/ChatBot/bot.png')}
          style={styles.chatbotIconImage}
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F2F1',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 10,
    paddingLeft: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 200,
  },
  suggestionsList: {
    borderRadius: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 10,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  searchButton: {
    backgroundColor: '#8E4DFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 15,
    elevation: 3,
    shadowColor: '#8E4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#B8B8B8',
    shadowOpacity: 0.1,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickSearchContainer: {
    marginTop: 20,
  },
  quickSearchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  quickSearchButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickButton: {
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 0.48,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#2E86AB',
    fontSize: 12,
    fontWeight: '500',
  },
  taglineContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  taglineTitle: {
    fontFamily: 'serif',
    fontSize: 26,
    color: '#333',
    textAlign: 'center',
  },
  taglineSubtitle: {
    fontSize: 20,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },
  chatbotButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 10,
  },
  chatbotIconImage: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
  },
});

export default HomeSearch;