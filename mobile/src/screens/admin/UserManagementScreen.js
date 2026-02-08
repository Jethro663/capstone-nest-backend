import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, FlatList } from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { adminService } from '../../services';

const UserManagementScreen = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminService.getUsers();
      setUsers(response);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await adminService.deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>
          {users.length} user{users.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.userCard}>
            <Card.Content>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.firstName} {item.lastName}
                  </Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <View style={styles.roleContainer}>
                  <Text
                    style={[
                      styles.roleBadge,
                      item.role === 'student' && styles.roleBadgeStudent,
                      item.role === 'teacher' && styles.roleBadgeTeacher,
                      item.role === 'admin' && styles.roleBadgeAdmin,
                    ]}
                  >
                    {item.role}
                  </Text>
                </View>
              </View>
              <View style={styles.userActions}>
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleDeleteUser(item.id)}
                />
              </View>
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  roleContainer: {
    marginLeft: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  roleBadgeStudent: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  roleBadgeTeacher: {
    backgroundColor: '#f3e8ff',
    color: '#581c87',
  },
  roleBadgeAdmin: {
    backgroundColor: '#fee2e2',
    color: '#7f1d1d',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

export default UserManagementScreen;
