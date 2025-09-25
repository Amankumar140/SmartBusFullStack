import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BusCard from '../../Components/Buses/BusCard';
import MapViewComponent from '../../Components/Map/MapViewComponent';
import BusDetailsModal from '../../Components/Buses/BusDetailsModal';
import RouteTimelineCard from '../../Components/Route/RouteTimelineCard';
import BusPlaceholderImage from '../../Assets/Bus/Bus1.png';
import { SafeAreaView } from 'react-native-safe-area-context';

const SearchResultsScreen = ({ navigation, route }) => {
  const { source, destination } = route.params || {};
  
  const [selectedBus, setSelectedBus] = useState(null);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showBusDetails, setShowBusDetails] = useState(false);

  // Convert coordinates to user-friendly place names
  const getPlaceFromCoordinates = (coordinateString) => {
    if (!coordinateString || !coordinateString.includes(',')) {
      return 'Location updating...';
    }
    
    const [lat, lng] = coordinateString.split(',').map(Number);
    
    // Get current hour and random variation for more natural descriptions
    const currentHour = new Date().getHours();
    const timeContext = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
    const variations = ['Near', 'Approaching', 'At', 'Passing through'];
    const randomVariation = variations[Math.floor(Math.random() * variations.length)];
    
    // Define coordinate ranges for different places with varied descriptions
    const places = [
      {
        name: `${randomVariation} ISBT Chandigarh`,
        lat: { min: 30.7200, max: 30.7400 },
        lng: { min: 76.7600, max: 76.7900 }
      },
      {
        name: `${randomVariation} Phagwara Bus Stop`,
        lat: { min: 31.2100, max: 31.2400 },
        lng: { min: 75.7600, max: 75.7900 }
      },
      {
        name: `${randomVariation} Jalandhar Bus Stand`,
        lat: { min: 31.3100, max: 31.3400 },
        lng: { min: 75.5600, max: 75.5900 }
      },
      {
        name: `${randomVariation} Kapurthala`,
        lat: { min: 31.3700, max: 31.4000 },
        lng: { min: 75.3700, max: 75.4000 }
      },
      {
        name: `${randomVariation} Ludhiana`,
        lat: { min: 30.8900, max: 30.9200 },
        lng: { min: 75.8400, max: 75.8700 }
      }
    ];
    
    // Find matching place
    for (const place of places) {
      if (lat >= place.lat.min && lat <= place.lat.max && 
          lng >= place.lng.min && lng <= place.lng.max) {
        return place.name;
      }
    }
    
    // Fallback based on general Punjab region
    if (lat >= 30.5 && lat <= 32.0 && lng >= 75.0 && lng <= 77.0) {
      return `Traveling through Punjab`;
    }
    
    return `En route to destination`;
  };
  
  const transformApiData = (apiBus) => {
    // Parse location from current_location field or use default coordinates
    let latitude = 30.7333; // Default to Chandigarh
    let longitude = 76.7794;
    
    if (apiBus.current_location) {
      if (apiBus.current_location.includes(',')) {
        const coords = apiBus.current_location.split(',').map(Number);
        if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          latitude = coords[0];
          longitude = coords[1];
        }
      }
    } else {
      // Add small random offset for each bus so they don't overlap
      const randomOffset = (Math.random() - 0.5) * 0.01;
      latitude += randomOffset;
      longitude += randomOffset;
    }
    
    return {
      // Core identifiers (ensure consistent ID mapping)
      id: apiBus.bus_id || apiBus.id,
      bus_id: apiBus.bus_id || apiBus.id,
      bus_number: apiBus.bus_number,
      
      // Status and operational info
      status: apiBus.status || 'unknown',
      
      // Route information
      route_id: apiBus.route_id,
      route_name: apiBus.route_name,
      source_stop: apiBus.source_stop || apiBus.start_stop_name,
      destination_stop: apiBus.destination_stop || apiBus.end_stop_name,
      
      // Driver information
      driver_id: apiBus.driver_id,
      driver_name: apiBus.driver_name,
      
      // Location data
      coordinate: { latitude, longitude },
      current_location: apiBus.current_location,
      
      // Additional bus properties
      capacity: apiBus.capacity || 50,
      distance_km: apiBus.distance_km || 0,
      
      // Legacy support for existing components
      busId: apiBus.bus_number,
      type: apiBus.status?.toLowerCase() === 'active' ? 'available' : 'alternate',
      eta: apiBus.status === 'active' ? 'On Route' : (apiBus.status || 'Unknown'),
      route: apiBus.route_name || 'Route not assigned',
      from: apiBus.source_stop || apiBus.start_stop_name || 'Unknown',
      to: apiBus.destination_stop || apiBus.end_stop_name || 'Unknown',
      imageUrl: BusPlaceholderImage,
      changeInfo: getPlaceFromCoordinates(apiBus.current_location),
    };
  };

  // Mock bus data as fallback
  const generateMockBuses = () => {
    return [
      {
        bus_id: 1,
        bus_number: 'PB-05-1234',
        status: 'active',
        route_id: 1,
        route_name: `${source} to ${destination}`,
        source_stop: source,
        destination_stop: destination,
        driver_name: 'Rajesh Kumar',
        driver_id: 1,
        current_location: '30.7333,76.7794',
        capacity: 45,
        distance_km: 25.5
      },
      {
        bus_id: 2,
        bus_number: 'PB-05-5678',
        status: 'active',
        route_id: 2,
        route_name: `${source} to ${destination}`,
        source_stop: source,
        destination_stop: destination,
        driver_name: 'Sukhdev Singh',
        driver_id: 2,
        current_location: '30.7350,76.7800',
        capacity: 50,
        distance_km: 28.2
      },
      {
        bus_id: 3,
        bus_number: 'PB-05-9012',
        status: 'inactive',
        route_id: 3,
        route_name: `${source} to ${destination}`,
        source_stop: source,
        destination_stop: destination,
        driver_name: 'Manpreet Kaur',
        driver_id: 3,
        current_location: '30.7320,76.7780',
        capacity: 40,
        distance_km: 22.8
      }
    ];
  };

  useEffect(() => {
    const fetchBuses = async () => {
      setLoading(true);
      if (!source || !destination) {
        setLoading(false);
        return;
      }
      try {
        const token = await AsyncStorage.getItem('user_token');
        if (!token) {
          console.log('No auth token found, using mock data');
          const mockBuses = generateMockBuses().map(transformApiData);
          setBuses(mockBuses);
          setLoading(false);
          return;
        }

        console.log('Attempting to fetch buses from API...');
        const response = await apiClient.get('/buses/search', {
          params: { source, destination },
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data && response.data.buses && response.data.buses.length > 0) {
          const transformedBuses = response.data.buses.map(transformApiData);
          setBuses(transformedBuses);
          console.log('Successfully fetched buses from API:', transformedBuses.length);
        } else {
          console.log('API returned no buses, using mock data');
          const mockBuses = generateMockBuses().map(transformApiData);
          setBuses(mockBuses);
        }
      } catch (error) {
        console.error('Failed to fetch buses from API:', error.message);
        console.log('Using mock bus data as fallback');
        // Use mock data as fallback when API fails
        const mockBuses = generateMockBuses().map(transformApiData);
        setBuses(mockBuses);
      } finally {
        setLoading(false);
      }
    };
    fetchBuses();
  }, [source, destination]);

  const handleBusSelect = bus => {
    if (selectedBus && selectedBus.id === bus.id) {
      // If clicking the same bus, show details modal
      setShowBusDetails(true);
    } else {
      // If selecting a different bus, set it as selected
      setSelectedBus(bus);
      setShowBusDetails(true);
    }
  };
  
  const handleTrackBus = (bus) => {
    setSelectedBus(bus);
    setShowMap(true);
    setShowBusDetails(false);
  };
  
  const handleCloseBusDetails = () => {
    setShowBusDetails(false);
  };
  
  const handleViewTimeline = () => {
    // For now, this just ensures the timeline card stays visible
    // Could add analytics or other functionality here
    console.log('Timeline card clicked for bus:', selectedBus?.bus_number);
  };
  
  const openChatbot = () => {
    navigation.navigate('ChatBot');
  };

  const activeBuses = buses.filter(bus => bus.status?.toLowerCase() === 'active');
  const otherBuses = buses.filter(bus => bus.status?.toLowerCase() !== 'active');
  const allBuses = buses;

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#8E4DFF" />
        <Text style={styles.loadingText}>Fetching Buses...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Results</Text>
        <TouchableOpacity 
          onPress={() => setShowMap(!showMap)}
          style={styles.mapToggleButton}
          activeOpacity={0.7}
        >
          <Icon name={showMap ? "close" : "google-maps"} size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* Route Info Component */}
      <View style={styles.routeInfo}>
        <Icon name="map-marker" size={16} color="#4CAF50" />
        <Text style={styles.routeText}>{source}</Text>
        <Icon name="arrow-right" size={16} color="#666" style={styles.arrowIcon} />
        <Icon name="map-marker" size={16} color="#FF5722" />
        <Text style={styles.routeText}>{destination}</Text>
      </View>
      
      
      {showMap && (
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>
              {selectedBus ? `Tracking Bus #${selectedBus.bus_number}` : 'All Buses'}
            </Text>
            <TouchableOpacity 
              onPress={() => setShowMap(false)}
              style={styles.mapCloseButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <MapViewComponent
            selectedBus={selectedBus}
            buses={allBuses}
            source={source}
            destination={destination}
          />
        </View>
      )}
      
      <BusDetailsModal
        visible={showBusDetails}
        bus={selectedBus}
        onClose={handleCloseBusDetails}
        onTrackBus={handleTrackBus}
      />

      <ScrollView style={styles.busListContainer}>
        {activeBuses.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Icon name="bus" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Active Buses</Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>
            {activeBuses.map(bus => (
              <BusCard 
                key={bus.id} 
                bus={bus} 
                onPress={handleBusSelect} 
                isSelected={selectedBus && selectedBus.id === bus.id}
              />
            ))}
          </>
        )}
        
        {otherBuses.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Icon name="bus-alert" size={20} color="#FF9800" />
              <Text style={styles.sectionTitle}>Other Buses</Text>
            </View>
            {otherBuses.map(bus => (
              <BusCard 
                key={bus.id} 
                bus={bus} 
                onPress={handleBusSelect} 
                isSelected={selectedBus && selectedBus.id === bus.id}
              />
            ))}
          </>
        )}
        
        {buses.length === 0 && (
          <View style={styles.noBusesContainer}>
            <Icon name="bus-off" size={48} color="#999" />
            <Text style={styles.noBusesText}>No buses found for this route.</Text>
            <Text style={styles.noBusesSubtext}>
              Try searching for a different route or check back later.
            </Text>
          </View>
        )}
        
        {/* Route Timeline Card - Show when bus is selected, at the bottom */}
        {selectedBus && !showMap && (
          <RouteTimelineCard
            source={source}
            destination={destination}
            selectedBus={selectedBus}
            totalStops={7} // Mock data - replace with actual stops count
            estimatedTime={selectedBus.eta || 'N/A'}
            onPress={handleViewTimeline}
          />
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.chatbotButton}
        onPress={openChatbot}
        activeOpacity={0.7}>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F2F1',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F4F2F1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  busListContainer: {
    flex: 1,
  },
  mapContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mapCloseButton: {
    padding: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  liveBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  noBusesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noBusesText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  noBusesSubtext: {
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
    fontSize: 14,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  routeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 6,
    flex: 0,
  },
  arrowIcon: {
    marginHorizontal: 8,
  },
  mapToggleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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

export default SearchResultsScreen;