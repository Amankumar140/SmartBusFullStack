import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { io } from 'socket.io-client';
import Icon from 'react-native-vector-icons/MaterialIcons';
import polyline from '@mapbox/polyline';
 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../../api/client';
import apiClient from '../../api/client';
import { GOOGLE_MAPS_API_KEY } from '@env';

const MapViewComponent = ({ selectedBus, buses, source, destination }) => {
  const [busPositions, setBusPositions] = useState(() => {
    const initialPositions = {};
    buses.forEach(bus => {
      if (bus.coordinate) {
        initialPositions[String(bus.bus_id || bus.id)] = bus.coordinate;
      }
    });
    return initialPositions;
  });
  const [isTracking, setIsTracking] = useState(false);
  
  // New state for enhanced route features
  const [routeStops, setRouteStops] = useState([]);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [currentBusPosition, setCurrentBusPosition] = useState(null);

  // Function to get coordinates from place names
  const getCoordinatesFromPlace = (placeName) => {
    if (!placeName) return null;
    
    const placeToCoords = {
      // Chandigarh variations
      'ISBT Chandigarh': { latitude: 30.7333, longitude: 76.7794 },
      'Chandigarh': { latitude: 30.7333, longitude: 76.7794 },
      'Sector 43, Chandigarh': { latitude: 30.7333, longitude: 76.7794 },
      
      // Ludhiana variations
      'Ludhiana Bus Stand': { latitude: 30.9010, longitude: 75.8573 },
      'Ludhiana': { latitude: 30.9010, longitude: 75.8573 },
      'Gill Road, Ludhiana': { latitude: 30.9010, longitude: 75.8573 },
      
      // Jalandhar variations
      'Jalandhar Bus Stand': { latitude: 31.3260, longitude: 75.5762 },
      'Jalandhar': { latitude: 31.3260, longitude: 75.5762 },
      'Nakodar Road, Jalandhar': { latitude: 31.3260, longitude: 75.5762 },
      
      // Amritsar variations
      'Amritsar Bus Stand': { latitude: 31.6340, longitude: 74.8723 },
      'Amritsar': { latitude: 31.6340, longitude: 74.8723 },
      'Grand Trunk Road, Amritsar': { latitude: 31.6340, longitude: 74.8723 },
      
      // Patiala variations
      'Patiala Bus Stand': { latitude: 30.3398, longitude: 76.3869 },
      'Patiala': { latitude: 30.3398, longitude: 76.3869 },
      'Bhupindra Road, Patiala': { latitude: 30.3398, longitude: 76.3869 },
      
      // Phagwara
      'Phagwara Bus Stop': { latitude: 31.2240, longitude: 75.7739 },
      'Phagwara': { latitude: 31.2240, longitude: 75.7739 },
    };
    
    // Try exact match first
    if (placeToCoords[placeName]) {
      return placeToCoords[placeName];
    }
    
    // Try partial match
    for (const [place, coords] of Object.entries(placeToCoords)) {
      if (placeName.toLowerCase().includes(place.toLowerCase()) || 
          place.toLowerCase().includes(placeName.toLowerCase())) {
        return coords;
      }
    }
    
    return null;
  };

  const mapRef = useRef(null);

  // Fetch route stops from backend API
  const fetchRouteStops = useCallback(async (busId) => {
    if (!busId) return;
    
    try {
      console.log('Fetching route stops for bus:', busId);
      const response = await apiClient.get(`/routes/bus/${busId}/timeline`);
      
      if (response.data?.success && response.data?.data?.timeline?.stops) {
        const stops = response.data.data.timeline.stops.map(stop => ({
          id: stop.id,
          name: stop.name,
          coordinate: {
            latitude: parseFloat(stop.latitude) || 0,
            longitude: parseFloat(stop.longitude) || 0
          },
          status: stop.status,
          eta: stop.eta,
          sequence_no: stop.stop_order
        }));
        
        setRouteStops(stops);
        console.log('Route stops loaded:', stops.length);
        
        // Set current bus position based on current stop
        const currentStop = stops.find(stop => stop.status === 'current');
        if (currentStop && currentStop.coordinate.latitude !== 0) {
          setCurrentBusPosition(currentStop.coordinate);
        }
        
        return stops;
      }
    } catch (error) {
      console.error('Error fetching route stops:', error);
    }
    return [];
  }, []);
  
  // Fetch Google Directions between source and destination
  const fetchGoogleDirections = useCallback(async (sourceCoord, destCoord, waypoints = []) => {
    if (!sourceCoord || !destCoord || !GOOGLE_MAPS_API_KEY) {
      console.warn('Missing coordinates or Google Maps API key for directions');
      return null;
    }
    
    try {
      setIsLoadingRoute(true);
      
      const origin = `${sourceCoord.latitude},${sourceCoord.longitude}`;
      const destination = `${destCoord.latitude},${destCoord.longitude}`;
      
      // Add waypoints if provided (intermediate stops)
      let waypointsStr = '';
      if (waypoints.length > 0) {
        const validWaypoints = waypoints
          .filter(wp => wp.latitude !== 0 && wp.longitude !== 0)
          .slice(0, 8); // Google allows max 8 waypoints
        
        if (validWaypoints.length > 0) {
          waypointsStr = `&waypoints=${validWaypoints
            .map(wp => `${wp.latitude},${wp.longitude}`)
            .join('|')}`;
        }
      }
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsStr}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;
      
      console.log('Fetching Google Directions:', url.replace(GOOGLE_MAPS_API_KEY, 'API_KEY_HIDDEN'));
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Decode polyline
        const points = polyline.decode(route.overview_polyline.points);
        const coordinates = points.map(point => ({
          latitude: point[0],
          longitude: point[1]
        }));
        
        setRoutePolyline(coordinates);
        setRouteDistance(route.legs.reduce((total, leg) => total + leg.distance.value, 0));
        setRouteDuration(route.legs.reduce((total, leg) => total + leg.duration.value, 0));
        
        console.log('Google Directions loaded:', coordinates.length, 'points');
        
        return {
          coordinates,
          distance: route.legs.reduce((total, leg) => total + leg.distance.value, 0),
          duration: route.legs.reduce((total, leg) => total + leg.duration.value, 0)
        };
      } else {
        console.warn('Google Directions API error:', data.status, data.error_message);
      }
    } catch (error) {
      console.error('Error fetching Google Directions:', error);
    } finally {
      setIsLoadingRoute(false);
    }
    
    return null;
  }, []);
  
  // Generate random position along route polyline
  const generateRandomBusPosition = useCallback((routeCoordinates, sourceCoord, destCoord) => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      // Use polyline coordinates for more realistic positioning
      const randomIndex = Math.floor(Math.random() * routeCoordinates.length);
      return routeCoordinates[randomIndex];
    } else if (sourceCoord && destCoord) {
      // Fallback: interpolate between source and destination
      const progress = Math.random(); // Random progress between 0 and 1
      const latitude = sourceCoord.latitude + (destCoord.latitude - sourceCoord.latitude) * progress;
      const longitude = sourceCoord.longitude + (destCoord.longitude - sourceCoord.longitude) * progress;
      return { latitude, longitude };
    }
    return null;
  }, []);

  // Load complete route data for selected bus
  const loadRouteData = useCallback(async (bus) => {
    if (!bus) {
      setRouteStops([]);
      setRoutePolyline([]);
      setCurrentBusPosition(null);
      return;
    }
    
    console.log('Loading route data for bus:', bus.bus_number);
    
    // Fetch route stops from backend
    const stops = await fetchRouteStops(bus.bus_id || bus.id);
    
    // Get source and destination coordinates
    const sourceCoord = getCoordinatesFromPlace(bus.source_stop || bus.from);
    const destCoord = getCoordinatesFromPlace(bus.destination_stop || bus.to);
    
    if (sourceCoord && destCoord) {
      // Use route stops as waypoints for Google Directions
      const waypoints = stops
        .filter(stop => stop.coordinate.latitude !== 0 && stop.coordinate.longitude !== 0)
        .slice(1, -1) // Remove first and last stops (they are source/destination)
        .map(stop => stop.coordinate);
      
      // Fetch Google Directions with waypoints
      const routeData = await fetchGoogleDirections(sourceCoord, destCoord, waypoints);
      
      // Generate random bus position along the route
      const randomPosition = generateRandomBusPosition(
        routeData?.coordinates,
        sourceCoord, 
        destCoord
      );
      
      console.log('🎲 Random position generation:');
      console.log('  - Route coordinates available:', routeData?.coordinates?.length || 0);
      console.log('  - Generated position:', randomPosition);
      console.log('  - Source coord:', sourceCoord);
      console.log('  - Dest coord:', destCoord);
      
      if (randomPosition) {
        console.log('✅ Setting random bus position:', randomPosition);
        setCurrentBusPosition(randomPosition);
      } else if (bus.coordinate) {
        console.log('⚠️ Fallback to bus coordinate:', bus.coordinate);
        setCurrentBusPosition(bus.coordinate);
      } else {
        // Last resort: use source coordinate
        console.log('🚨 Using source coordinate as fallback:', sourceCoord);
        setCurrentBusPosition(sourceCoord);
      }
    }
  }, [fetchRouteStops, fetchGoogleDirections, generateRandomBusPosition]);

  // Load route data and animate to selected bus location
  useEffect(() => {
    if (selectedBus) {
      console.log('Selected bus changed:', selectedBus.bus_number);
      
      // Load complete route data (this will generate a new random position)
      loadRouteData(selectedBus);
    } else {
      // Clear route data when no bus is selected
      setRouteStops([]);
      setRoutePolyline([]);
      setCurrentBusPosition(null);
    }
  }, [selectedBus, loadRouteData]);
  
  // Animate to bus location when position changes
  useEffect(() => {
    if (currentBusPosition && mapRef.current) {
      setTimeout(() => {
        mapRef.current.animateToRegion(
          {
            ...currentBusPosition,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          },
          1000,
        );
        console.log('Animated to bus position:', currentBusPosition);
      }, 500); // Small delay to ensure route data is loaded
    }
  }, [currentBusPosition]);
  
  // Force map to correct region on mount
  useEffect(() => {
    if (mapRef.current && buses.length > 0) {
      setTimeout(() => {
        const correctRegion = {
          latitude: 31.2240, // Phagwara
          longitude: 75.7739,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        };
        mapRef.current.animateToRegion(correctRegion, 2000);
        console.log('Forcing map to Punjab region:', correctRegion);
      }, 1000);
    }
  }, [buses]);

  useEffect(() => {
    let socket;
    let retryTimeout;
    
    const setupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token');
        if (!token) {
          console.log('No token available for socket connection');
          return;
        }

        console.log('Attempting to connect to socket for real-time tracking...');
        
        socket = io(SOCKET_URL, { 
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 5000,
          reconnectionAttempts: 3,
          reconnectionDelay: 2000
        });

        socket.on('bus-location-update', updatedBuses => {
          console.log('Real-time bus location update received:', updatedBuses.length, 'buses');
          setIsTracking(true);
          
          const newPositions = updatedBuses.reduce((acc, bus) => {
            try {
              if (bus.current_location) {
                const coords = bus.current_location.split(',').map(Number);
                if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                  acc[String(bus.bus_id)] = { 
                    latitude: coords[0], 
                    longitude: coords[1] 
                  };
                }
              }
            } catch (error) {
              console.error('Error parsing bus location:', error);
            }
            return acc;
          }, {});
          
          setBusPositions(prevPositions => ({
            ...prevPositions,
            ...newPositions,
          }));
        });

        socket.on('connect', () => {
          console.log('✅ Map socket connected successfully');
          setIsTracking(true);
          if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
          }
        });
        
        socket.on('disconnect', (reason) => {
          console.log('Map socket disconnected:', reason);
          setIsTracking(false);
        });
        
        socket.on('connect_error', err => {
          console.log('Socket connection failed - this is normal if real-time tracking is not set up yet');
          setIsTracking(false);
          
          // Don't retry immediately to avoid spam
          if (!retryTimeout) {
            retryTimeout = setTimeout(() => {
              console.log('Retrying socket connection...');
              if (socket) {
                socket.disconnect();
              }
              setupSocket();
            }, 10000); // Retry after 10 seconds
          }
        });
        
      } catch (error) {
        console.log('Socket setup error - continuing without real-time tracking');
        setIsTracking(false);
      }
    };
    
    // Only attempt socket connection if not already trying
    if (!socket) {
      setupSocket();
    }

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const getInitialRegion = () => {
    console.log('Getting initial region. Selected bus:', selectedBus);
    console.log('All buses:', buses.length);
    
    if (selectedBus && selectedBus.coordinate) {
      console.log('Using selected bus coordinate:', selectedBus.coordinate);
      return {
        ...selectedBus.coordinate,
        latitudeDelta: 0.05, // Closer zoom for selected bus
        longitudeDelta: 0.05,
      };
    }
    
    const busesWithCoords = buses.filter(bus => bus.coordinate);
    console.log('Buses with coordinates:', busesWithCoords.length);
    
    if (busesWithCoords.length > 0) {
      // Calculate center point of all buses
      const avgLat = busesWithCoords.reduce((sum, bus) => sum + bus.coordinate.latitude, 0) / busesWithCoords.length;
      const avgLng = busesWithCoords.reduce((sum, bus) => sum + bus.coordinate.longitude, 0) / busesWithCoords.length;
      
      console.log('Using calculated center:', { lat: avgLat, lng: avgLng });
      return {
        latitude: avgLat,
        longitude: avgLng,
        latitudeDelta: 0.15, // Wider view to show all buses
        longitudeDelta: 0.15,
      };
    }
    
    // Default to Punjab region to show the route
    console.log('Using default coordinates (Punjab region)');
    return {
      latitude: 31.2240, // Phagwara coordinates (center of route)
      longitude: 75.7739,
      latitudeDelta: 0.5, // Focused view on Punjab
      longitudeDelta: 0.5,
    };
  };

  const initialRegion = getInitialRegion();
  console.log('MapView will use initial region:', initialRegion);
  
  return (
    <View style={styles.container}>
      {isTracking ? (
        <View style={styles.trackingIndicator}>
          <View style={styles.trackingDot} />
          <Text style={styles.trackingText}>Live Tracking Active</Text>
        </View>
      ) : selectedBus ? (
        <View style={[styles.trackingIndicator, styles.staticTrackingIndicator]}>
          <View style={[styles.trackingDot, styles.staticTrackingDot]} />
          <Text style={[styles.trackingText, styles.staticTrackingText]}>Route Tracking</Text>
        </View>
      ) : null}
      
      <View style={styles.mapInfo}>
        <Text style={styles.mapInfoText}>
          📍 {buses.length} buses | 🇮🇳 Punjab
          {routeStops.length > 0 && ` | ${routeStops.length} stops`}
          {routeDistance && ` | ${(routeDistance / 1000).toFixed(1)} km`}
        </Text>
        {selectedBus && (
          <Text style={styles.selectedBusInfo}>
            🚍 {selectedBus.bus_number} | 
            {selectedBus.source_stop || selectedBus.from} → {selectedBus.destination_stop || selectedBus.to}
            {isLoadingRoute && ' • Loading route...'}
          </Text>
        )}
        {/* Debug Info - Remove in production */}
        {currentBusPosition && (
          <Text style={[styles.selectedBusInfo, { fontSize: 10, color: '#666' }]}>
            📄 Bus Position: {currentBusPosition.latitude.toFixed(4)}, {currentBusPosition.longitude.toFixed(4)}
          </Text>
        )}
      </View>
      
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        onMapReady={() => console.log('Map is ready!')}
        onRegionChangeComplete={(region) => console.log('Region changed:', region)}
      >
        {/* Google Directions Polyline */}
        {routePolyline.length > 0 && (
          <Polyline
            coordinates={routePolyline}
            strokeColor="#2196F3"
            strokeWidth={5}
            strokeOpacity={0.8}
            zIndex={1}
          />
        )}
        
        {/* Route Stops Markers */}
        {routeStops.map((stop, index) => {
          if (stop.coordinate.latitude === 0 && stop.coordinate.longitude === 0) {
            return null; // Skip invalid coordinates
          }
          
          const isFirst = index === 0;
          const isLast = index === routeStops.length - 1;
          const isCurrent = stop.status === 'current';
          
          let markerColor = '#9E9E9E'; // Default upcoming
          if (stop.status === 'completed') markerColor = '#4CAF50';
          if (stop.status === 'current') markerColor = '#2196F3';
          
          return (
            <Marker
              key={`stop-${stop.id}`}
              coordinate={stop.coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
              title={stop.name}
              description={`${stop.status.toUpperCase()} • ETA: ${stop.eta}`}
            >
              <View style={styles.stopMarkerContainer}>
                <View style={[
                  styles.stopMarker,
                  { backgroundColor: markerColor },
                  isFirst && styles.sourceStopMarker,
                  isLast && styles.destStopMarker,
                  isCurrent && styles.currentStopMarker
                ]}>
                  <Text style={styles.stopMarkerText}>
                    {isFirst ? 'S' : isLast ? 'D' : isCurrent ? '🚍' : stop.sequence_no}
                  </Text>
                </View>
                {isCurrent && (
                  <View style={styles.currentStopPulse} />
                )}
              </View>
            </Marker>
          );
        })}
        
        {/* Current Bus Position Marker (Enhanced & Highly Visible) */}
        {currentBusPosition && selectedBus && (
          <Marker
            coordinate={currentBusPosition}
            anchor={{ x: 0.5, y: 0.5 }}
            title={`Bus #${selectedBus.bus_number} (Live Position)`}
            description={`Random Position: ${currentBusPosition.latitude.toFixed(4)}, ${currentBusPosition.longitude.toFixed(4)}`}
            zIndex={15}
          >
            <View style={styles.currentBusMarkerContainer}>
              {/* Pulse animation background */}
              <View style={styles.currentBusPulse} />
              <View style={styles.currentBusPulse2} />
              
              {/* Main bus icon */}
              <View style={styles.currentBusIconEnhanced}>
                <Text style={styles.currentBusEmojiLarge}>🚍</Text>
              </View>
              
              {/* Bus number badge */}
              <View style={styles.currentBusNumberBadge}>
                <Text style={styles.currentBusNumberText}>
                  {selectedBus.bus_number.slice(-4)}
                </Text>
              </View>
            </View>
          </Marker>
        )}
        
        {/* Debug Info - Remove in production */}
        {currentBusPosition && (
          <Marker
            coordinate={{
              latitude: currentBusPosition.latitude + 0.001,
              longitude: currentBusPosition.longitude + 0.001
            }}
            anchor={{ x: 0, y: 0 }}
            zIndex={5}
          >
            <View style={{ backgroundColor: 'rgba(255,0,0,0.8)', padding: 4, borderRadius: 4 }}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>BUS HERE</Text>
            </View>
          </Marker>
        )}
        
        {/* All Other Buses */}
        {buses.map((bus, index) => {
          const busId = String(bus.bus_id || bus.id);
          const isSelected = selectedBus && (selectedBus.bus_id || selectedBus.id) === (bus.bus_id || bus.id);
          
          // Don't show selected bus marker here (it's shown as currentBusPosition)
          if (isSelected && currentBusPosition) {
            return null;
          }
          
          let currentPosition = busPositions[busId] || bus.coordinate;
          
          // Fallback: ensure bus has valid coordinates
          if (!currentPosition || !currentPosition.latitude || !currentPosition.longitude) {
            currentPosition = {
              latitude: 31.2240 + (index * 0.01), // Phagwara with small offset
              longitude: 75.7739 + (index * 0.01)
            };
          }
          
          const isActive = bus.status?.toLowerCase() === 'active' || bus.status?.toLowerCase() === 'running';
          
          return (
            <Marker
              key={busId}
              identifier={busId}
              coordinate={currentPosition}
              anchor={{ x: 0.5, y: 0.5 }}
              title={`Bus #${bus.bus_number}`}
              description={`${bus.status?.toUpperCase()} • ${bus.route_name || 'Route not assigned'}`}
            >
              <View style={[
                styles.markerContainer,
                isSelected && styles.selectedMarkerContainer
              ]}>
                <View style={[
                  styles.busIconContainer,
                  isActive ? styles.activeBusContainer : styles.inactiveBusContainer,
                  isSelected && styles.selectedBusContainer
                ]}>
                  <Text style={[
                    styles.busEmoji,
                    isSelected && styles.selectedBusEmoji
                  ]}>
                    🚍
                  </Text>
                </View>
                
                <View style={[
                  styles.busNumberBadge,
                  isActive ? styles.activeBadge : styles.inactiveBadge,
                  isSelected && styles.selectedBadge
                ]}>
                  <Text style={[
                    styles.busNumberText,
                    isSelected && styles.selectedBusNumberText
                  ]}>
                    {bus.bus_number.slice(-4)}
                  </Text>
                </View>
                
                {isActive && <View style={styles.liveDot} />}
              </View>
            </Marker>
          );
        })}
        
        {/* Route Line for Selected Bus */}
        {selectedBus && selectedBus.source_stop && selectedBus.destination_stop && (() => {
          const sourceCoords = getCoordinatesFromPlace(selectedBus.source_stop);
          const destCoords = getCoordinatesFromPlace(selectedBus.destination_stop);
          const busCoords = selectedBus.coordinate;
          
          if (sourceCoords && destCoords) {
            let routeCoords = [sourceCoords];
            
            // Add bus current position if available
            if (busCoords && busCoords.latitude && busCoords.longitude) {
              routeCoords.push(busCoords);
            }
            
            routeCoords.push(destCoords);
            
            return (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#2196F3" // Blue color
                strokeWidth={4}
                lineDashPattern={[10, 5]} // Dashed line pattern
              />
            );
          }
          return null;
        })()}
        
        {/* General Route Line based on search source/destination */}
        {source && destination && (() => {
          const sourceCoords = getCoordinatesFromPlace(source);
          const destCoords = getCoordinatesFromPlace(destination);
          
          if (sourceCoords && destCoords) {
            return (
              <>
                {/* Source marker */}
                <Marker
                  coordinate={sourceCoords}
                  anchor={{ x: 0.5, y: 1 }}
                  title={`Source: ${source}`}
                >
                  <View style={styles.routeMarker}>
                    <Icon name="map-marker" size={30} color="#4CAF50" />
                  </View>
                </Marker>
                
                {/* Destination marker */}
                <Marker
                  coordinate={destCoords}
                  anchor={{ x: 0.5, y: 1 }}
                  title={`Destination: ${destination}`}
                >
                  <View style={styles.routeMarker}>
                    <Icon name="map-marker" size={30} color="#FF5722" />
                  </View>
                </Marker>
                
                {/* Route line */}
                <Polyline
                  coordinates={[sourceCoords, destCoords]}
                  strokeColor="#87CEEB" // Sky blue color
                  strokeWidth={3}
                  strokeOpacity={0.8}
                  lineDashPattern={[8, 4]} // Dashed line pattern
                />
              </>
            );
          }
          return null;
        })()}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  map: {
    height: 400,
    width: '100%',
  },
  trackingIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 6,
  },
  trackingText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  staticTrackingIndicator: {
    backgroundColor: '#2196F3',
  },
  staticTrackingDot: {
    backgroundColor: 'white',
  },
  staticTrackingText: {
    color: 'white',
  },
  mapInfo: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 1000,
  },
  mapInfoText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  selectedBusInfo: {
    fontSize: 11,
    color: '#2196F3',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 2,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMarkerContainer: {
    transform: [{ scale: 1.2 }],
  },
  busIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  activeBusContainer: {
    backgroundColor: '#4CAF50',
  },
  inactiveBusContainer: {
    backgroundColor: '#FF5722',
  },
  selectedBusContainer: {
    backgroundColor: '#2196F3',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  busIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  selectedBusIcon: {
    width: 28,
    height: 28,
  },
  busEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  selectedBusEmoji: {
    fontSize: 24,
  },
  busNumberBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  activeBadge: {
    backgroundColor: '#2E7D32',
  },
  inactiveBadge: {
    backgroundColor: '#D84315',
  },
  selectedBadge: {
    backgroundColor: '#1565C0',
  },
  busNumberText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  selectedBusNumberText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  liveDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    borderWidth: 1,
    borderColor: 'white',
  },
  infoBubble: {
    marginTop: 8,
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  infoBubbleText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  routeMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // New styles for enhanced map features
  stopMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sourceStopMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
  },
  destStopMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF5722',
  },
  currentStopMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
  },
  stopMarkerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  currentStopPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    opacity: 0.3,
    transform: [{ scale: 1.5 }],
  },
  currentBusMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  currentBusMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 100,
    height: 100,
  },
  currentBusPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF4444',
    opacity: 0.3,
  },
  currentBusPulse2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6666',
    opacity: 0.5,
  },
  currentBusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  currentBusIconEnhanced: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 10,
  },
  currentBusEmoji: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  currentBusEmojiLarge: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  currentBusNumberBadge: {
    position: 'absolute',
    bottom: -5,
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 6,
  },
  currentBusNumberText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default MapViewComponent;
