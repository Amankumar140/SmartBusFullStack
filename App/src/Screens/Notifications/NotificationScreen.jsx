import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  StatusBar, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import apiClient from '../../api/client';
import NotificationItem from '../../Components/Notification/Notification';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SOCKET_URL } from '../../api/client';

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, unread, urgent
  const [socket, setSocket] = useState(null);

  // No need for data transformation since the new API returns data in the correct format

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const token = await AsyncStorage.getItem('user_token');
      if (!token) {
        if (showLoading) setLoading(false);
        return;
      }

      // Build query parameters based on current filter
      let queryParams = '';
      if (filter === 'unread') {
        queryParams = '?is_read=false';
      } else if (filter === 'urgent') {
        queryParams = '?priority=urgent';
      }

      const response = await apiClient.get(`/notifications${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread_count || 0);
      } else {
        console.error('Failed to fetch notifications:', response.data.message);
      }

    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      Alert.alert(
        'Error',
        'Failed to load notifications. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) return;

      await apiClient.patch(`/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.notification_id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) return;

      await apiClient.patch('/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          is_read: true
        }))
      );
      
      setUnreadCount(0);
      Alert.alert('Success', 'All notifications marked as read');

    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) return;

      await apiClient.delete(`/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.filter(notification =>
          notification.notification_id !== notificationId
        )
      );
      
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n.notification_id === notificationId);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

    } catch (error) {
      console.error('Failed to delete notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  }, [notifications]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(false);
  }, [fetchNotifications]);

  useEffect(() => {
    const connectAndFetch = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token');
        if (!token) {
          setLoading(false);
          return;
        }

        // Initial fetch
        await fetchNotifications();

        // Setup Socket.IO connection
        const socketUrl = SOCKET_URL;
        const newSocket = io(socketUrl, {
          auth: { token },
        });

        newSocket.on('connect', () => {
          console.log('Connected to WebSocket server!');
        });
        
        newSocket.on('new_notification', (data) => {
          console.log('Real-time notification received:', data);
          if (Array.isArray(data) && data.length > 0) {
            setNotifications(prevNotifications => {
              // Add new notifications to the top
              const newNotifications = data.filter(newNotif => 
                !prevNotifications.some(existingNotif => 
                  existingNotif.notification_id === newNotif.notification_id
                )
              );
              return [...newNotifications, ...prevNotifications];
            });
            
            // Update unread count
            const unreadNewNotifications = data.filter(n => !n.is_read);
            if (unreadNewNotifications.length > 0) {
              setUnreadCount(prev => prev + unreadNewNotifications.length);
            }
          }
        });

        newSocket.on('urgent_notifications', (data) => {
          console.log('Urgent notification received:', data);
          if (Array.isArray(data) && data.length > 0) {
            data.forEach(urgentNotif => {
              Alert.alert(
                urgentNotif.title,
                urgentNotif.message,
                [{ text: 'OK' }],
                { cancelable: false }
              );
            });
          }
        });

        newSocket.on('connect_error', (err) => {
          console.error('Socket connection error:', err.message);
        });

        setSocket(newSocket);

      } catch (error) {
        console.error('Failed to setup notifications:', error);
        setLoading(false);
      }
    };

    connectAndFetch();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Refetch when filter changes
  useEffect(() => {
    if (!loading) {
      fetchNotifications(false);
    }
  }, [filter, fetchNotifications]);

  // Filter buttons
  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {['all', 'unread', 'urgent'].map((filterType) => {
        const isActive = filter === filterType;
        const count = filterType === 'unread' ? unreadCount : 
                      filterType === 'urgent' ? notifications.filter(n => n.priority === 'urgent').length : 
                      notifications.length;
        
        return (
          <TouchableOpacity
            key={filterType}
            style={[styles.filterButton, isActive && styles.activeFilterButton]}
            onPress={() => setFilter(filterType)}
          >
            <Text style={[styles.filterButtonText, isActive && styles.activeFilterButtonText]}>
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              {count > 0 && ` (${count})`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderEmptyList = () => {
    let emptyMessage = 'No notifications';
    let emptySubMessage = "We'll let you know when something new comes up.";
    
    if (filter === 'unread') {
      emptyMessage = 'No unread notifications';
      emptySubMessage = 'All caught up! Check back later for updates.';
    } else if (filter === 'urgent') {
      emptyMessage = 'No urgent notifications';
      emptySubMessage = 'No urgent matters at the moment.';
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Icon name="bell-off-outline" size={60} color="#BDBDBD" />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        <Text style={styles.emptySubText}>{emptySubMessage}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8E4DFF" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllReadButton}
            onPress={markAllAsRead}
          >
            <Icon name="check-all" size={20} color="#8E4DFF" />
            <Text style={styles.markAllReadText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Buttons */}
      {renderFilterButtons()}

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <NotificationItem 
            item={item} 
            onMarkAsRead={markAsRead}
            onDelete={deleteNotification}
          />
        )}
        keyExtractor={item => item.notification_id?.toString() || item.id?.toString()}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8E4DFF']}
            tintColor="#8E4DFF"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  markAllReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
  },
  markAllReadText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#8E4DFF',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 12,
  },
  activeFilterButton: {
    backgroundColor: '#8E4DFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationScreen;