import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
} from 'react-native';
import { Card, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [users] = useState([
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'student@gmail.com',
      roles: [{ name: 'student' }],
      status: 'ACTIVE',
    },
    {
      id: 2,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'teacher@gmail.com',
      roles: [{ name: 'teacher' }],
      status: 'ACTIVE',
    },
    {
      id: 3,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@gmail.com',
      roles: [{ name: 'admin' }],
      status: 'ACTIVE',
    },
  ]);

  const stats = {
    users: users.length,
    subjects: 12,
    sections: 8,
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return '#dc2626';
      case 'teacher':
        return '#8b5cf6';
      case 'student':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    return status === 'ACTIVE' ? '#10b981' : '#dc2626';
  };

  const renderUserRow = ({ item }) => (
    <View style={styles.userRow}>
      <View style={styles.userInfo}>
        <Text style={styles.userRowName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.roleStatusContainer}>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: getRoleColor(item.roles[0].name) + '20' },
          ]}
        >
          <Text
            style={[
              styles.roleBadgeText,
              { color: getRoleColor(item.roles[0].name) },
            ]}
          >
            {item.roles[0].name}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome,</Text>
              <Text style={styles.userName}>Administrator</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileButton}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={40}
                color="#dc2626"
              />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="account-multiple"
              size={24}
              color="#3b82f6"
            />
            <Text style={styles.statNumber}>{stats.users}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="book"
              size={24}
              color="#8b5cf6"
            />
            <Text style={styles.statNumber}>{stats.subjects}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="folder"
              size={24}
              color="#ec4899"
            />
            <Text style={styles.statNumber}>{stats.sections}</Text>
            <Text style={styles.statLabel}>Sections</Text>
          </Card.Content>
        </Card>
      </View>

      {/* User Management Section */}
      <View style={styles.managementSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>User Management</Text>
          <Text style={styles.sectionSubtitle}>
            Manage and monitor all system users
          </Text>
        </View>

        <Card style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Role</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
          </View>

          <FlatList
            data={users}
            renderItem={renderUserRow}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerCard: {
    margin: 16,
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
    borderWidth: 1,
  },
  headerContent: {
    paddingVertical: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    elevation: 2,
    borderRadius: 8,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  managementSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  userRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  roleCell: {
    flex: 1.5,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusCell: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default AdminDashboardScreen;
