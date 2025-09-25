// src/components/Buses/BusDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';

const BusDetailsModal = ({ visible, bus, onClose, onTrackBus }) => {
  const [loading, setLoading] = useState(false);
  const [busDetails, setBusDetails] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [realTimeLocation, setRealTimeLocation] = useState(null);

  useEffect(() => {
    if (visible && bus) {
      // Fetch all bus details and real-time data
      fetchBusDetails();
      fetchRouteStops();
      fetchRealTimeLocation();
      console.log('Bus details modal opened with bus:', bus);
    }
  }, [visible, bus]);

  const generateMockBusDetails = () => {
    return {
      bus_id: bus.bus_id || bus.id,
      bus_number: bus.bus_number || 'Unknown',
      driver_name: bus.driver_name || 'Assigned Driver',
      capacity: bus.capacity || 45,
      route_name: bus.route || `${bus.from} to ${bus.to}`,
      status: bus.status || 'active',
      fuel_level: '85%',
      last_maintenance: '2024-01-15',
      registration_number: bus.bus_number || 'PB-05-XXXX',
    };
  };

  const fetchBusDetails = async () => {
    if (!bus) {
      console.log('No bus object provided, skipping API call');
      return;
    }

    console.log('Using mock bus details for smooth operation');
    setLoading(true);

    // Simulate API loading delay
    setTimeout(() => {
      setBusDetails(generateMockBusDetails());
      setLoading(false);
    }, 500);
  };

  // Generate intermediate stops based on route (same logic as RouteTimelineCard)
  const getIntermediateStops = (start, end) => {
    const routeStopsMap = {
      Amritsar: {
        Jalandhar: [{ name: 'Tarn Taran' }, { name: 'Goindwal Sahib' }],
        Ludhiana: [
          { name: 'Tarn Taran' },
          { name: 'Kapurthala' },
          { name: 'Jalandhar' },
        ],
        Chandigarh: [
          { name: 'Kapurthala' },
          { name: 'Jalandhar' },
          { name: 'Ludhiana' },
        ],
      },
      Chandigarh: {
        Ludhiana: [{ name: 'Rajpura' }, { name: 'Patiala' }],
        Jalandhar: [
          { name: 'Rajpura' },
          { name: 'Patiala' },
          { name: 'Sangrur' },
        ],
        Amritsar: [
          { name: 'Patiala' },
          { name: 'Sangrur' },
          { name: 'Jalandhar' },
        ],
      },
      Ludhiana: {
        Jalandhar: [{ name: 'Phagwara' }],
        Amritsar: [{ name: 'Jalandhar' }, { name: 'Kapurthala' }],
        Chandigarh: [{ name: 'Sirhind' }, { name: 'Rajpura' }],
      },
      Barnala: {
        Hoshiarpur: [
          { name: 'Sangrur' },
          { name: 'Ludhiana' },
          { name: 'Jalandhar' },
        ],
      },
    };

    const route = routeStopsMap[start]?.[end];
    if (route) {
      return route;
    }

    // Fallback intermediate stops
    return [{ name: 'City Center' }, { name: 'Bus Stand' }];
  };

  const generateMockRouteStops = () => {
    // Use the exact same logic as RouteTimelineCard for consistency
    const busSource = bus?.source_stop || bus?.from || 'Source Stop';
    const busDestination =
      bus?.destination_stop || bus?.to || 'Destination Stop';

    console.log(
      'BusDetailsModal: Generating fallback stops for route:',
      busSource,
      'to',
      busDestination,
    );

    // Generate intermediate stops based on the route
    const intermediateStops = getIntermediateStops(busSource, busDestination);

    const fallbackStops = [
      {
        id: 1,
        name: busSource,
        status: 'completed',
        eta: 'Departed',
        arrivalTime: '09:00 AM',
        time: '09:00 AM',
        distance: 0,
        stop_order: 1,
        stop_name: busSource,
        arrival_time: '09:00 AM',
        formatted_time: '09:00 AM',
      },
      ...intermediateStops.map((stop, index) => ({
        id: index + 2,
        name: stop.name,
        status: index === 0 ? 'current' : 'upcoming',
        eta: index === 0 ? '2 min' : `${15 + index * 12} min`,
        arrivalTime: `${9 + Math.floor((index + 1) * 0.25)}:${String(
          ((index + 1) * 15) % 60,
        ).padStart(2, '0')} AM`,
        time: `${9 + Math.floor((index + 1) * 0.25)}:${String(
          ((index + 1) * 15) % 60,
        ).padStart(2, '0')} AM`,
        distance: (index + 1) * 12.5,
        stop_order: index + 2,
        stop_name: stop.name,
        arrival_time: `${9 + Math.floor((index + 1) * 0.25)}:${String(
          ((index + 1) * 15) % 60,
        ).padStart(2, '0')} AM`,
        formatted_time: `${9 + Math.floor((index + 1) * 0.25)}:${String(
          ((index + 1) * 15) % 60,
        ).padStart(2, '0')} AM`,
      })),
      {
        id: intermediateStops.length + 2,
        name: busDestination,
        status: 'upcoming',
        eta: `${30 + intermediateStops.length * 12} min`,
        arrivalTime: `${
          10 + Math.floor(intermediateStops.length * 0.25)
        }:00 AM`,
        time: `${10 + Math.floor(intermediateStops.length * 0.25)}:00 AM`,
        distance: (intermediateStops.length + 2) * 12.5,
        stop_order: intermediateStops.length + 2,
        stop_name: busDestination,
        arrival_time: `${
          10 + Math.floor(intermediateStops.length * 0.25)
        }:00 AM`,
        formatted_time: `${
          10 + Math.floor(intermediateStops.length * 0.25)
        }:00 AM`,
      },
    ];

    console.log(
      'BusDetailsModal: Generated fallback timeline with',
      fallbackStops.length,
      'stops for route:',
      busSource,
      '->',
      busDestination,
    );
    return fallbackStops;
  };

  // const fetchRouteStops = async () => {
  //   if (!bus) {
  //     console.log('No bus provided for route stops');
  //     return;
  //   }

  //   const busId = bus.bus_id || bus.id;
  //   if (!busId) {
  //     console.log('No valid bus ID for route stops, using mock data:', bus);
  //     setRouteStops(generateMockRouteStops());
  //     return;
  //   }

  //   try {
  //     const token = await AsyncStorage.getItem('user_token');
  //     if (!token) {
  //       console.log('No token found for route stops, using mock data');
  //       setRouteStops(generateMockRouteStops());
  //       return;
  //     }

  //     console.log('Fetching route stops for bus ID:', busId);
  //     // Use the same endpoint as Route Timeline Card for consistency
  //     const response = await apiClient.get(`/routes/bus/${busId}/timeline`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });

  //     if (
  //       response.data &&
  //       response.data.success &&
  //       response.data.data &&
  //       response.data.data.timeline &&
  //       response.data.data.timeline.stops
  //     ) {
  //       // Process the timeline data exactly like RouteTimelineCard does
  //       const { timeline, route, bus: busData } = response.data.data;

  //       if (timeline.stops && timeline.stops.length > 0) {
  //         const processedStops = timeline.stops.map(stop => ({
  //           id: stop.id,
  //           name: stop.name,
  //           status: stop.status,
  //           eta: stop.eta,
  //           arrivalTime: stop.arrivalTime,
  //           time: stop.time || stop.arrivalTime,
  //           distance: stop.distance,
  //           stop_order: stop.stop_order,
  //           stop_name: stop.name,
  //           arrival_time: stop.arrivalTime,
  //           formatted_time: stop.arrivalTime,
  //         }));

  //         setRouteStops(processedStops);
  //         console.log(
  //           'Successfully fetched route stops:',
  //           processedStops.length,
  //         );

  //         // Extract last seen data from backend if available
  //         if (busData && busData.last_seen) {
  //           const backendLastSeen = busData.last_seen;
  //           console.log('Backend last seen data received:', backendLastSeen);

  //           // Store in busDetails for use in Last Seen section
  //           setBusDetails(prevDetails => ({
  //             ...prevDetails,
  //             last_seen: backendLastSeen,
  //           }));
  //         }

  //         // Also check timeline level last seen data
  //         if (timeline.last_seen_stop) {
  //           console.log(
  //             'Timeline last seen data received:',
  //             timeline.last_seen_stop,
  //           );
  //           setRealTimeLocation(prev => ({
  //             ...prev,
  //             last_seen: timeline.last_seen_stop,
  //           }));
  //         }
  //       } else {
  //         console.log(
  //           'Timeline data exists but no stops found, using mock data',
  //         );
  //         setRouteStops(generateMockRouteStops());
  //       }
  //     } else {
  //       console.log('API returned no stops, using mock data');
  //       setRouteStops(generateMockRouteStops());
  //     }
  //   } catch (error) {
  //     console.error(
  //       'Failed to fetch route stops from API:',
  //       error.response?.status,
  //       error.response?.data?.message || error.message,
  //     );

  //     if (error.response?.status === 404) {
  //       console.log(
  //         'Bus timeline not found - this is normal for buses not on active routes',
  //       );
  //     } else if (error.response?.status === 401) {
  //       console.error('Authentication error - token might be invalid');
  //     }

  //     console.log('Using mock route stops as fallback');
  //     setRouteStops(generateMockRouteStops());
  //   }
  // };

  const fetchRouteStops = async () => {
    if (!bus) {
      console.log('No bus provided for route stops');
      return;
    }

    const busId = bus.bus_id || bus.id;
    // THE KEY: Get the route_id that was assigned during the search.
    const searchedRouteId = bus.route_id;

    if (!busId) {
      console.log('No valid bus ID for route stops, using mock data:', bus);
      setRouteStops(generateMockRouteStops());
      return;
    }

    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) {
        console.log('No token found for route stops, using mock data');
        setRouteStops(generateMockRouteStops());
        return;
      }

      console.log(
        `Fetching route stops for bus ID: ${busId} on SEARCHED route ID: ${searchedRouteId}`,
      );

      // --- MODIFIED API CALL ---
      // We now pass the 'searchedRouteId' as a query parameter.
      const response = await apiClient.get(
        `/routes/bus/${busId}/timeline?route_id=${searchedRouteId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (
        response.data &&
        response.data.success &&
        response.data.data &&
        response.data.data.timeline &&
        response.data.data.timeline.stops
      ) {
        // Process the timeline data exactly like RouteTimelineCard does
        const { timeline, route, bus: busData } = response.data.data;

        if (timeline.stops && timeline.stops.length > 0) {
          const processedStops = timeline.stops.map(stop => ({
            id: stop.id,
            name: stop.name,
            status: stop.status,
            eta: stop.eta,
            arrivalTime: stop.arrivalTime,
            time: stop.time || stop.arrivalTime,
            distance: stop.distance,
            stop_order: stop.stop_order,
            stop_name: stop.name,
            arrival_time: stop.arrivalTime,
            formatted_time: stop.arrivalTime,
          }));

          setRouteStops(processedStops);
          console.log(
            'Successfully fetched route stops:',
            processedStops.length,
          );

          // Extract last seen data from backend if available
          if (busData && busData.last_seen) {
            const backendLastSeen = busData.last_seen;
            console.log('Backend last seen data received:', backendLastSeen);

            // Store in busDetails for use in Last Seen section
            setBusDetails(prevDetails => ({
              ...prevDetails,
              last_seen: backendLastSeen,
            }));
          }

          // Also check timeline level last seen data
          if (timeline.last_seen_stop) {
            console.log(
              'Timeline last seen data received:',
              timeline.last_seen_stop,
            );
            setRealTimeLocation(prev => ({
              ...prev,
              last_seen: timeline.last_seen_stop,
            }));
          }
        } else {
          console.log(
            'Timeline data exists but no stops found, using mock data',
          );
          setRouteStops(generateMockRouteStops());
        }
      } else {
        console.log('API returned no stops, using mock data');
        setRouteStops(generateMockRouteStops());
      }
    } catch (error) {
      console.error(
        'Failed to fetch route stops from API:',
        error.response?.status,
        error.response?.data?.message || error.message,
      );

      if (error.response?.status === 404) {
        console.log(
          'Bus timeline not found - this is normal for buses not on active routes',
        );
      } else if (error.response?.status === 401) {
        console.error('Authentication error - token might be invalid');
      }

      console.log('Using mock route stops as fallback');
      setRouteStops(generateMockRouteStops());
    }
  };

  const generateMockRealTimeLocation = () => {
    return {
      latitude: 30.7333 + (Math.random() - 0.5) * 0.01,
      longitude: 76.7794 + (Math.random() - 0.5) * 0.01,
      timestamp: new Date().toISOString(),
      speed: Math.floor(Math.random() * 60) + 20, // 20-80 km/h
      heading: Math.floor(Math.random() * 360),
      accuracy: Math.floor(Math.random() * 10) + 5, // 5-15 meters
      status: 'moving',
    };
  };

  const fetchRealTimeLocation = async () => {
    if (!bus) {
      console.log('No bus provided, skipping real-time location API call');
      return;
    }

    console.log('Using mock real-time location for smooth operation');
    setRealTimeLocation(generateMockRealTimeLocation());
  };

  const handleTrackBus = () => {
    if (onTrackBus) {
      onTrackBus(bus);
    }
    onClose();
  };

  const getStatusColor = status => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'running':
        return '#4CAF50';
      case 'inactive':
      case 'idle':
        return '#FF5722';
      case 'maintenance':
        return '#FF9800';
      default:
        return '#757575';
    }
  };

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Loading bus details...</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // If no bus data, don't show modal
  if (!bus) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Bus #{bus?.bus_number}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(bus?.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {bus?.status?.toUpperCase()}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Route Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="route" size={20} color="#2196F3" />
                <Text style={styles.sectionTitle}>Route Information</Text>
              </View>
              <View style={styles.routeCard}>
                <Text style={styles.routeName}>
                  {busDetails?.route_name ||
                    bus?.route_name ||
                    bus?.route ||
                    'Route not assigned'}
                </Text>
                <Text style={styles.routeDistance}>
                  Distance:{' '}
                  {busDetails?.distance_km || bus?.distance_km || 'Unknown'} km
                </Text>
                <View style={styles.routePoints}>
                  <View style={styles.routePoint}>
                    <Icon name="my-location" size={16} color="#4CAF50" />
                    <Text style={styles.routePointText}>
                      {busDetails?.start_stop_name ||
                        bus?.source_stop ||
                        bus?.from ||
                        'Start point'}
                    </Text>
                  </View>
                  <Icon
                    name="arrow-downward"
                    size={16}
                    color="#666"
                    style={styles.routeArrow}
                  />
                  <View style={styles.routePoint}>
                    <Icon name="location-on" size={16} color="#FF5722" />
                    <Text style={styles.routePointText}>
                      {busDetails?.end_stop_name ||
                        bus?.destination_stop ||
                        bus?.to ||
                        'End point'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Driver Information */}
            {(busDetails?.driver_name || bus?.driver_name) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="person" size={20} color="#2196F3" />
                  <Text style={styles.sectionTitle}>Driver Information</Text>
                </View>
                <View style={styles.driverCard}>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>
                      {busDetails?.driver_name || bus?.driver_name}
                    </Text>
                    {/* Call driver option removed since live tracking is not available */}
                  </View>
                </View>
              </View>
            )}

            {/* Last Seen Section - Based on backend timeline data or local calculation */}
            {routeStops.length > 0 &&
              (() => {
                // Try to get backend last seen data first
                let backendLastSeen = null;
                try {
                  // Check if we have backend data with last seen info
                  if (busDetails?.last_seen || realTimeLocation?.last_seen) {
                    backendLastSeen =
                      busDetails?.last_seen || realTimeLocation?.last_seen;
                  }
                } catch (error) {
                  console.log('No backend last seen data available');
                }

                // Fallback to local calculation from route stops
                const currentStop = routeStops.find(
                  stop =>
                    stop.status === 'current' ||
                    stop.eta === '5 min' ||
                    stop.eta?.includes('min'),
                );
                const lastCompletedStop = routeStops
                  .filter(
                    stop =>
                      stop.status === 'completed' || stop.eta === 'Passed',
                  )
                  .pop();

                let displayStop, isAtCurrentStop, statusMessage;

                if (backendLastSeen) {
                  // Use backend data
                  displayStop = {
                    name: backendLastSeen.stop_name,
                    arrivalTime: backendLastSeen.time,
                    eta: backendLastSeen.eta,
                    status: backendLastSeen.status,
                  };
                  isAtCurrentStop = backendLastSeen.status === 'current';
                  statusMessage = backendLastSeen.message;
                } else {
                  // Use local calculation
                  displayStop =
                    currentStop || lastCompletedStop || routeStops[0];
                  isAtCurrentStop = currentStop !== undefined;
                  statusMessage = isAtCurrentStop
                    ? 'Currently at stop'
                    : 'Last seen at stop';
                }

                if (!displayStop) return null;

                return (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Icon name="location-on" size={20} color="#2196F3" />
                      <Text style={styles.sectionTitle}>
                        Last Seen Location
                      </Text>
                    </View>
                    <View style={styles.locationCard}>
                      <View style={styles.lastSeenStatus}>
                        <View style={styles.lastSeenHeader}>
                          <View style={styles.lastSeenIndicator}>
                            <View
                              style={[
                                styles.lastSeenDot,
                                {
                                  backgroundColor: isAtCurrentStop
                                    ? '#4CAF50'
                                    : '#FF9800',
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.lastSeenText,
                                {
                                  color: isAtCurrentStop
                                    ? '#4CAF50'
                                    : '#FF9800',
                                },
                              ]}
                            >
                              {isAtCurrentStop
                                ? 'Currently at'
                                : 'Last seen at'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.lastSeenLocation}>
                          {displayStop.name ||
                            displayStop.stop_name ||
                            'Unknown Stop'}
                        </Text>
                        <Text style={styles.lastSeenTime}>
                          {isAtCurrentStop
                            ? `ETA: ${displayStop.eta || 'On time'}`
                            : `Time: ${
                                displayStop.arrivalTime ||
                                displayStop.arrival_time ||
                                'Unknown time'
                              }`}
                        </Text>
                        <Text style={styles.lastSeenStatusMessage}>
                          {statusMessage ||
                            (displayStop.status
                              ? `Status: ${
                                  displayStop.status.charAt(0).toUpperCase() +
                                  displayStop.status.slice(1)
                                }`
                              : '')}
                        </Text>
                        {backendLastSeen && (
                          <View style={styles.dataSourceIndicator}>
                            <Icon name="cloud-done" size={12} color="#4CAF50" />
                            <Text style={styles.dataSourceText}>
                              Live data from server
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })()}

            {/* Live Location Status - Commented out since live tracking is not working */}
            {/* 
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="gps-fixed" size={20} color="#2196F3" />
                <Text style={styles.sectionTitle}>Location Status</Text>
              </View>
              <View style={styles.locationCard}>
                {realTimeLocation?.is_live ? (
                  <View style={styles.liveStatus}>
                    <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>Live Tracking Active</Text>
                    </View>
                    <Text style={styles.locationDetails}>
                      Speed: {realTimeLocation.real_time_location?.speed || '0'} km/h
                    </Text>
                    <Text style={styles.locationDetails}>
                      Last Update: {new Date(realTimeLocation.real_time_location?.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.offlineStatus}>
                    <Icon name="location-off" size={24} color="#FF9800" />
                    <Text style={styles.offlineText}>Live tracking not available</Text>
                    <Text style={styles.offlineSubtext}>
                      Showing last known location
                    </Text>
                  </View>
                )}
              </View>
            </View>
            */}

            {/* Route Stops Timeline */}
            {routeStops.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="timeline" size={20} color="#2196F3" />
                  <Text style={styles.sectionTitle}>
                    Route Timeline ({routeStops.length} stops)
                  </Text>
                </View>

                {/* Timeline Status Info */}
                <View style={styles.timelineStatusInfo}>
                  <Icon
                    name={routeStops.length > 6 ? 'check-circle' : 'info'}
                    size={14}
                    color={routeStops.length > 6 ? '#4CAF50' : '#FF9800'}
                  />
                  <Text style={styles.timelineStatusText}>
                    {routeStops.length > 6
                      ? 'Real route data loaded'
                      : 'Sample timeline data'}
                  </Text>
                </View>

                <View style={styles.timelineContainer}>
                  {routeStops.slice(0, 8).map((stop, index) => {
                    // Enhanced stop data processing
                    const stopName =
                      stop.name || stop.stop_name || `Stop ${index + 1}`;
                    const stopTime =
                      stop.arrivalTime ||
                      stop.arrival_time ||
                      stop.formatted_time ||
                      `${9 + index}:${(index * 15) % 60 < 10 ? '0' : ''}${
                        (index * 15) % 60
                      } AM`;
                    const stopStatus =
                      stop.eta ||
                      stop.status ||
                      (index < 2
                        ? 'Completed'
                        : index === 2
                        ? 'Current'
                        : 'Upcoming');

                    return (
                      <View
                        key={stop.stop_id || stop.id || index}
                        style={styles.timelineItem}
                      >
                        <View style={styles.timelineMarker}>
                          <View
                            style={[
                              styles.timelineDot,
                              index === 0 && styles.timelineStartDot,
                              index === routeStops.slice(0, 8).length - 1 &&
                                styles.timelineEndDot,
                              index === 2 && styles.timelineCurrentDot,
                            ]}
                          />
                          {index < routeStops.slice(0, 8).length - 1 && (
                            <View
                              style={[
                                styles.timelineLine,
                                index < 2 && styles.timelineCompletedLine,
                              ]}
                            />
                          )}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text
                            style={[
                              styles.stopName,
                              index === 2 && styles.currentStopName,
                            ]}
                          >
                            {stopName}
                          </Text>
                          <Text style={styles.stopTime}>{stopTime}</Text>
                          <Text
                            style={[
                              styles.stopLocation,
                              index < 2 && styles.completedStopStatus,
                              index === 2 && styles.currentStopStatus,
                            ]}
                          >
                            {stopStatus}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {routeStops.length > 8 && (
                    <View style={styles.moreStopsIndicator}>
                      <Text style={styles.moreStopsText}>
                        +{routeStops.length - 8} more stops
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Bus Specifications */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="info" size={20} color="#2196F3" />
                <Text style={styles.sectionTitle}>Bus Information</Text>
              </View>
              <View style={styles.specsCard}>
                {/* <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Capacity:</Text>
                  <Text style={styles.specValue}>
                    {busDetails?.capacity || bus?.capacity || '50'} passengers
                  </Text>
                </View> */}
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Bus Number:</Text>
                  <Text style={styles.specValue}>{bus?.bus_number}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Status:</Text>
                  <Text
                    style={[
                      styles.specValue,
                      { color: getStatusColor(bus?.status) },
                    ]}
                  >
                    {bus?.status?.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            {/*{(bus?.status?.toLowerCase() === 'active' || bus?.status?.toLowerCase() === 'running') && (
              <TouchableOpacity onPress={handleTrackBus} style={styles.trackButton}>
                <Icon name="my-location" size={20} color="white" />
                <Text style={styles.trackButtonText}>Track on Map</Text>
              </TouchableOpacity>
            )} */}
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '50%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  routeCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  routeDistance: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  routePoints: {
    alignItems: 'flex-start',
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routePointText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  routeArrow: {
    marginLeft: 8,
    marginVertical: 4,
  },
  driverCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  driverInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  locationCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  liveStatus: {
    alignItems: 'flex-start',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  liveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  locationDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  offlineStatus: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  offlineText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
    marginTop: 8,
  },
  offlineSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  lastSeenStatus: {
    alignItems: 'flex-start',
  },
  lastSeenHeader: {
    marginBottom: 8,
  },
  lastSeenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastSeenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  lastSeenText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastSeenLocation: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  lastSeenTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lastSeenStatusMessage: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  dataSourceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  dataSourceText: {
    fontSize: 11,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineMarker: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
  timelineStartDot: {
    backgroundColor: '#4CAF50',
  },
  timelineEndDot: {
    backgroundColor: '#FF5722',
  },
  timelineCurrentDot: {
    backgroundColor: '#2196F3',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  timelineCompletedLine: {
    backgroundColor: '#4CAF50',
  },
  timelineStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timelineStatusText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  currentStopName: {
    color: '#2196F3',
    fontWeight: '700',
  },
  completedStopStatus: {
    color: '#4CAF50',
  },
  currentStopStatus: {
    color: '#2196F3',
    fontWeight: '600',
  },
  moreStopsIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
  },
  moreStopsText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  stopTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  stopLocation: {
    fontSize: 12,
    color: '#999',
  },
  specsCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 14,
    color: '#666',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  trackButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  trackButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default BusDetailsModal;
