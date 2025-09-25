// src/components/NotificationItem.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';

// Helper function to get icon based on notification type
const getIconForType = (type) => {
  switch (type) {
    case 'bus_arrival':
      return 'bus-clock';
    case 'bus_delay':
      return 'bus-alert';
    case 'bus_cancelled':
      return 'bus-stop';
    case 'route_change':
      return 'road-variant';
    case 'service_alert':
      return 'alert-circle-outline';
    case 'emergency':
      return 'alert-octagram';
    case 'general':
    default:
      return 'information-outline';
  }
};

// Helper function to get priority color
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'urgent':
      return '#FF4444';
    case 'high':
      return '#FF8800';
    case 'medium':
      return '#4CAF50';
    case 'low':
    default:
      return '#9E9E9E';
  }
};

// Helper function to get priority text
const getPriorityText = (priority) => {
  switch (priority) {
    case 'urgent':
      return 'URGENT';
    case 'high':
      return 'HIGH';
    case 'medium':
      return 'MEDIUM';
    case 'low':
      return 'LOW';
    default:
      return '';
  }
};

const NotificationItem = ({ item, onMarkAsRead, onDelete }) => {
  const icon = getIconForType(item.type);
  const priorityColor = getPriorityColor(item.priority);
  const priorityText = getPriorityText(item.priority);
  
  // Choose container style based on read status
  const containerStyle = item.is_read
    ? styles.container
    : [styles.container, styles.unreadContainer];

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMs = now - date;
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return new Date(timestamp).toLocaleString();
    }
  };

  const handlePress = async () => {
    // Mark as read when tapped
    if (!item.is_read && onMarkAsRead) {
      await onMarkAsRead(item.notification_id);
    }
  };

  const handleLongPress = () => {
    Alert.alert(
      'Notification Options',
      'Choose an action for this notification',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: item.is_read ? 'Mark as Unread' : 'Mark as Read',
          onPress: () => onMarkAsRead && onMarkAsRead(item.notification_id),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete && onDelete(item.notification_id),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity 
      style={containerStyle}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Icon 
          name={icon} 
          size={28} 
          color={priorityColor} 
          style={styles.icon} 
        />
        {item.priority === 'urgent' && (
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
            <Text style={styles.priorityText}>!</Text>
          </View>
        )}
      </View>
      
      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, !item.is_read && styles.unreadTitle]}>
            {item.title || 'Notification'}
          </Text>
          {item.priority !== 'low' && (
            <View style={[styles.priorityLabel, { borderColor: priorityColor }]}>
              <Text style={[styles.priorityLabelText, { color: priorityColor }]}>
                {priorityText}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.message, !item.is_read && styles.unreadMessage]}>
          {item.message}
        </Text>
        
        {(item.bus_number || item.source_name) && (
          <Text style={styles.contextInfo}>
            {item.bus_number && `Bus: ${item.bus_number}`}
            {item.bus_number && item.source_name && ' • '}
            {item.source_name && item.destination_name && 
              `${item.source_name} → ${item.destination_name}`
            }
          </Text>
        )}
        
        <View style={styles.bottomRow}>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.created_at || item.timestamp)}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginHorizontal: 2,
    marginVertical: 1,
  },
  unreadContainer: {
    backgroundColor: '#F8F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  iconContainer: {
    position: 'relative',
    marginRight: 16,
    marginTop: 2,
  },
  icon: {
    // Icon styles handled by the component
  },
  priorityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  priorityLabel: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  priorityLabelText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  unreadMessage: {
    color: '#444',
  },
  contextInfo: {
    fontSize: 13,
    color: '#8E4DFF',
    fontWeight: '500',
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
});

export default NotificationItem;