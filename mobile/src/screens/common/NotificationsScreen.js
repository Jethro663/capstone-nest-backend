import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Assignment Due',
      message: 'Your Math assignment is due tomorrow',
      timestamp: new Date(Date.now() - 3600000),
      read: false,
      type: 'assignment',
    },
    {
      id: 2,
      title: 'New Message',
      message: 'You have a new message from your teacher',
      timestamp: new Date(Date.now() - 7200000),
      read: false,
      type: 'message',
    },
    {
      id: 3,
      title: 'Grade Posted',
      message: 'Your test has been graded',
      timestamp: new Date(Date.now() - 86400000),
      read: true,
      type: 'grade',
    },
  ]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'assignment':
        return 'file-document';
      case 'message':
        return 'message';
      case 'grade':
        return 'check-circle';
      default:
        return 'bell';
    }
  };

  const handleDismiss = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const renderNotification = ({ item }) => (
    <Card
      style={[
        styles.notificationCard,
        item.read && styles.notificationCardRead,
      ]}
    >
      <Card.Content>
        <View style={styles.notificationContent}>
          <View style={styles.notificationIcon}>
            <MaterialCommunityIcons
              name={getIcon(item.type)}
              size={24}
              color={item.read ? '#9ca3af' : '#3b82f6'}
            />
          </View>

          <View style={styles.notificationText}>
            <Text
              style={[
                styles.notificationTitle,
                item.read && styles.notificationTitleRead,
              ]}
            >
              {item.title}
            </Text>
            <Text style={styles.notificationMessage}>
              {item.message}
            </Text>
            <Text style={styles.notificationTime}>
              {item.timestamp.toLocaleString()}
            </Text>
          </View>

          <IconButton
            icon="close"
            size={20}
            onPress={() => handleDismiss(item.id)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={48}
              color="#d1d5db"
            />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  notificationCard: {
    marginBottom: 12,
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  notificationCardRead: {
    backgroundColor: '#f9fafb',
    borderLeftColor: '#d1d5db',
  },
  notificationContent: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  notificationTitleRead: {
    color: '#9ca3af',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
});

export default NotificationsScreen;
