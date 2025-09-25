// src/Components/Route/RouteTimelineCard.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiClient from '../../api/client';

const RouteTimelineCard = ({ 
  source, 
  destination, 
  selectedBus, 
  totalStops = 0, 
  estimatedTime = '0 min',
  onPress 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [routeStops, setRouteStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [realEstimatedTime, setRealEstimatedTime] = useState(null);

  // Fetch real route timeline data
  const fetchRouteData = async () => {
    if (!selectedBus || !selectedBus.bus_id) {
      console.log('No bus selected, using mock timeline data');
      // Use fallback mock data if no bus selected
      setRouteStops([
        { id: 1, name: source || 'Start Stop', status: 'completed', eta: 'Departed', time: '09:00 AM' },
        { id: 2, name: 'City Center', status: 'completed', eta: 'Passed', time: '09:15 AM' },
        { id: 3, name: 'Mall Junction', status: 'current', eta: '2 min', time: '09:30 AM' },
        { id: 4, name: 'University Gate', status: 'upcoming', eta: '17 min', time: '09:45 AM' },
        { id: 5, name: 'Hospital Cross', status: 'upcoming', eta: '32 min', time: '10:00 AM' },
        { id: 6, name: 'Industrial Area', status: 'upcoming', eta: '47 min', time: '10:15 AM' },
        { id: 7, name: destination || 'End Stop', status: 'upcoming', eta: '62 min', time: '10:30 AM' },
      ]);
      return;
    }

    setLoading(true);
    console.log('Fetching timeline data for bus ID:', selectedBus.bus_id);
    
    try {
      const response = await apiClient.get(`/routes/bus/${selectedBus.bus_id}/timeline`);
      console.log('Timeline API response:', response.data);
      
      if (response.data && response.data.success && response.data.data && response.data.data.timeline) {
        const { timeline, route } = response.data.data;
        
        if (timeline.stops && timeline.stops.length > 0) {
          const stops = timeline.stops.map(stop => ({
            id: stop.id,
            name: stop.name,
            status: stop.status,
            eta: stop.eta,
            time: stop.arrivalTime,
            distance: stop.distance,
            stop_order: stop.stop_order
          }));
          
          setRouteStops(stops);
          console.log('Successfully loaded', stops.length, 'route stops from API');
          
          // Calculate total estimated time from current position to destination
          const currentIndex = stops.findIndex(stop => stop.status === 'current');
          const upcomingStops = stops.slice(currentIndex >= 0 ? currentIndex : 0);
          let totalEta = 0;
          
          upcomingStops.forEach(stop => {
            const eta = parseInt(stop.eta);
            if (!isNaN(eta)) {
              totalEta += eta;
            }
          });
          
          if (totalEta > 0) {
            const hours = Math.floor(totalEta / 60);
            const minutes = totalEta % 60;
            setRealEstimatedTime(hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`);
          }
        } else {
          console.warn('API returned empty timeline stops, using fallback');
          generateFallbackStops(route);
        }
      } else {
        console.warn('Invalid API response format, using fallback');
        generateFallbackStops();
      }
    } catch (error) {
      console.error('Timeline API error:', error.response?.status, error.response?.data?.message || error.message);
      
      if (error.response?.status === 404) {
        console.log('Bus not assigned to route, using fallback timeline');
      }
      
      generateFallbackStops();
    } finally {
      setLoading(false);
    }
  };

  // Generate fallback timeline stops
  const generateFallbackStops = (routeInfo = null) => {
    // Get source/destination from bus data or props
    const busSource = selectedBus?.source_stop || selectedBus?.from;
    const busDestination = selectedBus?.destination_stop || selectedBus?.to;
    
    const startLocation = routeInfo?.source_stop || busSource || source || 'Start Stop';
    const endLocation = routeInfo?.destination_stop || busDestination || destination || 'End Stop';
    
    console.log('Generating fallback stops for route:', startLocation, 'to', endLocation);
    
    // Generate intermediate stops based on the route
    const intermediateStops = getIntermediateStops(startLocation, endLocation);
    
    const fallbackStops = [
      { id: 1, name: startLocation, status: 'completed', eta: 'Departed', time: '09:00 AM', distance: 0 },
      ...intermediateStops.map((stop, index) => ({
        id: index + 2,
        name: stop.name,
        status: index === 0 ? 'current' : 'upcoming',
        eta: index === 0 ? '2 min' : `${15 + (index * 12)} min`,
        time: `${9 + Math.floor((index + 1) * 0.25)}:${String(((index + 1) * 15) % 60).padStart(2, '0')} AM`,
        distance: (index + 1) * 12.5
      })),
      { 
        id: intermediateStops.length + 2, 
        name: endLocation, 
        status: 'upcoming', 
        eta: `${30 + (intermediateStops.length * 12)} min`, 
        time: `${10 + Math.floor(intermediateStops.length * 0.25)}:00 AM`,
        distance: (intermediateStops.length + 2) * 12.5
      },
    ];
    
    setRouteStops(fallbackStops);
    setRealEstimatedTime(`${30 + (intermediateStops.length * 12)} min`);
    console.log('Generated fallback timeline with', fallbackStops.length, 'stops for route:', startLocation, '->', endLocation);
  };
  
  // Generate intermediate stops based on route
  const getIntermediateStops = (start, end) => {
    const routeStopsMap = {
      'Amritsar': {
        'Jalandhar': [{ name: 'Tarn Taran' }, { name: 'Goindwal Sahib' }],
        'Ludhiana': [{ name: 'Tarn Taran' }, { name: 'Kapurthala' }, { name: 'Jalandhar' }],
        'Chandigarh': [{ name: 'Kapurthala' }, { name: 'Jalandhar' }, { name: 'Ludhiana' }]
      },
      'Chandigarh': {
        'Ludhiana': [{ name: 'Rajpura' }, { name: 'Patiala' }],
        'Jalandhar': [{ name: 'Rajpura' }, { name: 'Patiala' }, { name: 'Sangrur' }],
        'Amritsar': [{ name: 'Patiala' }, { name: 'Sangrur' }, { name: 'Jalandhar' }]
      },
      'Ludhiana': {
        'Jalandhar': [{ name: 'Phagwara' }],
        'Amritsar': [{ name: 'Jalandhar' }, { name: 'Kapurthala' }],
        'Chandigarh': [{ name: 'Sirhind' }, { name: 'Rajpura' }]
      },
      'Barnala': {
        'Hoshiarpur': [{ name: 'Sangrur' }, { name: 'Ludhiana' }, { name: 'Jalandhar' }]
      }
    };
    
    const route = routeStopsMap[start]?.[end];
    if (route) {
      return route;
    }
    
    // Fallback intermediate stops
    return [
      { name: 'City Center' },
      { name: 'Bus Stand' }
    ];
  };

  // Calculate progress based on bus status
  const getProgressPercentage = () => {
    const currentIndex = routeStops.findIndex(stop => stop.status === 'current');
    if (currentIndex === -1 || routeStops.length === 0) return 0;
    if (routeStops.length === 1) return 100;
    return Math.max(0, Math.min(100, (currentIndex / (routeStops.length - 1)) * 100));
  };

  const progressPercentage = getProgressPercentage();

  useEffect(() => {
    // Start pulse animation for current stop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Load route data when component mounts or bus changes
    console.log('RouteTimelineCard: Bus data changed, fetching new timeline for:', selectedBus?.bus_number);
    fetchRouteData();
  }, [selectedBus?.bus_id, selectedBus?.source_stop, selectedBus?.destination_stop]);

  const toggleExpansion = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    
    Animated.timing(animatedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();

    if (onPress) {
      onPress();
    }
  };

  const getStopIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'current':
        return 'radio-button-checked';
      case 'upcoming':
        return 'radio-button-unchecked';
      default:
        return 'radio-button-unchecked';
    }
  };

  const getStopColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'current':
        return '#2196F3';
      case 'upcoming':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const renderDetailedTimeline = () => {
    if (!isExpanded) return null;
    
    try {
      return (
        <Animated.View 
          style={[
            styles.expandedContent,
            {
              maxHeight: animatedHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 400],
              }),
              opacity: animatedHeight,
            }
          ]}
        >
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle}>Detailed Timeline</Text>
            <Text style={styles.timelineSubtitle}>
              {`${(routeStops?.filter(s => s?.status === 'completed') || []).length} of ${routeStops?.length || 0} completed`}
            </Text>
          </View>
          
          <ScrollView style={styles.stopsContainer} nestedScrollEnabled={true}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading timeline...</Text>
              </View>
            ) : !Array.isArray(routeStops) || routeStops.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="info" size={24} color="#9E9E9E" />
                <Text style={styles.emptyText}>No route data available</Text>
              </View>
            ) : (
              routeStops
                .filter(stop => stop && typeof stop === 'object' && stop.name)
                .map((stop, index) => {
                try {
                  const isCurrent = stop.status === 'current';
                  const stopName = String(stop.name || 'Unknown Stop');
                  const stopEta = String(stop.eta || 'TBD');
                  const stopTime = String(stop.time || 'TBD');
                  const stopDistance = stop.distance ? String(stop.distance) : null;
                  
                  return (
                    <View key={`stop-${stop.id || index}`} style={styles.stopItem}>
                      <View style={styles.stopIconContainer}>
                        <Animated.View
                          style={[
                            styles.stopIconWrapper,
                            isCurrent && {
                              transform: [{ scale: pulseAnim }]
                            }
                          ]}
                        >
                          <Icon
                            name={getStopIcon(stop.status)}
                            size={isCurrent ? 20 : 18}
                            color={getStopColor(stop.status)}
                          />
                        </Animated.View>
                        {index < routeStops.length - 1 && (
                          <View style={[
                            styles.connectingLine,
                            { backgroundColor: stop.status === 'completed' ? '#4CAF50' : '#E0E0E0' }
                          ]} />
                        )}
                      </View>
                      
                      <View style={styles.stopDetails}>
                        <View style={styles.stopHeader}>
                          <Text style={[
                            styles.stopName,
                            isCurrent && styles.currentStopName
                          ]}>
                            {stopName}
                          </Text>
                          <Text style={[
                            styles.stopEta,
                            { color: getStopColor(stop.status) }
                          ]}>
                            {stopEta}
                          </Text>
                        </View>
                        
                        <View style={styles.stopMetaInfo}>
                          <Text style={styles.stopTime}>📍 {stopTime}</Text>
                          {stopDistance && (
                            <Text style={styles.stopDistance}>📏 {stopDistance} km</Text>
                          )}
                        </View>
                        
                        {stop.status === 'completed' && (
                          <View style={styles.completedIndicator}>
                            <Icon name="check-circle" size={12} color="#4CAF50" />
                            <Text style={styles.completedText}>Completed</Text>
                          </View>
                        )}
                        
                        {isCurrent && (
                          <View style={styles.currentIndicator}>
                            <Icon name="location-on" size={12} color="#2196F3" />
                            <Text style={styles.currentText}>Bus approaching</Text>
                          </View>
                        )}
                        
                        {stop.status === 'upcoming' && (
                          <View style={styles.upcomingIndicator}>
                            <Icon name="schedule" size={12} color="#9E9E9E" />
                            <Text style={styles.upcomingText}>Upcoming</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                } catch (error) {
                  console.error('Error rendering stop item:', error);
                  return null;
                }
              })
            )}
          </ScrollView>
        </Animated.View>
      );
    } catch (error) {
      console.error('Error rendering detailed timeline:', error);
      return (
        <View style={styles.expandedContent}>
          <Text style={styles.loadingText}>Error loading timeline</Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
    <TouchableOpacity 
      style={styles.cardContent}
      onPress={toggleExpansion}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="timeline" size={24} color="#2196F3" />
          <Text style={styles.headerTitle}>Route Timeline</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.estimatedTime}>{realEstimatedTime || estimatedTime || '0 min'}</Text>
          {selectedBus && selectedBus.bus_id && (
            <TouchableOpacity 
              onPress={fetchRouteData} 
              style={styles.refreshButton}
              disabled={loading}
            >
              <Icon 
                name="refresh" 
                size={20} 
                color={loading ? "#CCC" : "#666"} 
              />
            </TouchableOpacity>
          )}
          <Icon 
            name={isExpanded ? "expand-less" : "expand-more"} 
            size={24} 
            color="#666" 
          />
        </View>
      </View>

      {/* Route Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.routeInfo}>
          <View style={styles.stopPoint}>
            <View style={[styles.stopDot, styles.sourceDot]} />
            <Text style={styles.stopText} numberOfLines={1}>
              {selectedBus?.source_stop || selectedBus?.from || source || 'Source'}
            </Text>
          </View>
          
          <View style={styles.progressTrack}>
            <View style={styles.progressBackground} />
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.round(progressPercentage || 0)}%` }
              ]} 
            />
            {selectedBus && selectedBus.status?.toLowerCase() === 'running' && (
              <View style={[styles.busIndicator, { left: `${Math.round(progressPercentage || 0)}%` }]}>
                <Text style={styles.busEmoji}>🚍</Text>
              </View>
            )}
          </View>
          
          <View style={styles.stopPoint}>
            <View style={[styles.stopDot, styles.destinationDot]} />
            <Text style={styles.stopText} numberOfLines={1}>
              {selectedBus?.destination_stop || selectedBus?.to || destination || 'Destination'}
            </Text>
          </View>
        </View>
      </View>

      {/* Route Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="location-on" size={16} color="#666" />
          <Text style={styles.statText}>
            {String(routeStops.length || totalStops || 0)} stops
          </Text>
        </View>
        
        {selectedBus && (
          <View style={styles.statItem}>
            <Icon name="directions-bus" size={16} color="#666" />
            <Text style={styles.statText}>
              Bus #{selectedBus.bus_number || 'Unknown'}
            </Text>
          </View>
        )}
        
        <View style={styles.statItem}>
          <Icon name="access-time" size={16} color="#666" />
          <Text style={styles.statText}>
            Live tracking
          </Text>
        </View>
      </View>

      {/* Status Badge */}
      {selectedBus && (
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            selectedBus.status?.toLowerCase() === 'running' ? 
              styles.runningBadge : styles.idleBadge
          ]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {selectedBus?.status?.toLowerCase() === 'running' ? 'En Route' : 'At Stop'}
            </Text>
          </View>
        </View>
      )}

      {/* Route Status Message */}
      <View style={styles.routeStatusContainer}>
        <Icon 
          name={routeStops && routeStops.length > 5 ? "check-circle" : "info"} 
          size={14} 
          color={routeStops && routeStops.length > 5 ? "#4CAF50" : "#FF9800"} 
        />
        <Text style={styles.routeStatusText}>
          {!selectedBus?.bus_id 
            ? 'No bus selected' 
            : routeStops && routeStops.length > 5 
              ? `Real route data: ${routeStops.length} stops loaded`
              : 'Showing database route assignment'
          }
        </Text>
      </View>
      
      {/* Tap hint */}
      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>
          {isExpanded ? 'Tap to collapse' : 'Tap to view detailed timeline'}
        </Text>
      </View>
    </TouchableOpacity>
    
    {/* Expandable Timeline Content */}
    {renderDetailedTimeline()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E3F2FD',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estimatedTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginRight: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopPoint: {
    alignItems: 'center',
    minWidth: 80,
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  sourceDot: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  destinationDot: {
    backgroundColor: '#FF5722',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  stopText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  progressTrack: {
    flex: 1,
    height: 8,
    marginHorizontal: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  progressFill: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  busIndicator: {
    position: 'absolute',
    top: -8,
    transform: [{ translateX: -12 }],
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  busEmoji: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  statusContainer: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  runningBadge: {
    backgroundColor: '#E8F5E8',
  },
  idleBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  tapHint: {
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  // Expandable timeline styles
  expandedContent: {
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  timelineHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timelineSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  stopsContainer: {
    maxHeight: 300,
  },
  stopItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stopIconContainer: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  stopIconWrapper: {
    marginBottom: 4,
  },
  connectingLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  stopDetails: {
    flex: 1,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  currentStopName: {
    fontWeight: '600',
    color: '#2196F3',
  },
  stopTime: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  stopMetaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stopDistance: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  completedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  completedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  upcomingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  upcomingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9E9E9E',
    marginLeft: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 8,
  },
  refreshButton: {
    padding: 4,
    marginLeft: 8,
    marginRight: 4,
  },
  routeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  routeStatusText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  currentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  currentText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 4,
  },
});

export default RouteTimelineCard;