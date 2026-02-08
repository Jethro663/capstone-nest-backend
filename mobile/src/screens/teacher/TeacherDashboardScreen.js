import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const TeacherDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [classes] = useState([
    {
      id: 1,
      name: 'Introduction to Web Development',
      subject: 'Web Development',
      section: 'Section A',
      studentCount: 32,
      schedule: 'Mon, Wed, Fri - 10:00 AM',
    },
    {
      id: 2,
      name: 'Advanced React Patterns',
      subject: 'Frontend Development',
      section: 'Section B',
      studentCount: 28,
      schedule: 'Tue, Thu - 2:00 PM',
    },
    {
      id: 3,
      name: 'Database Design',
      subject: 'Backend Development',
      section: 'Section C',
      studentCount: 25,
      schedule: 'Mon, Wed - 1:00 PM',
    },
    {
      id: 4,
      name: 'Mobile Development',
      subject: 'Mobile Apps',
      section: 'Section A',
      studentCount: 20,
      schedule: 'Tue, Thu - 10:00 AM',
    },
  ]);

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileButton}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={40}
                color="#8b5cf6"
              />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="school"
              size={24}
              color="#8b5cf6"
            />
            <Text style={styles.statNumber}>{classes.length}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="account-multiple"
              size={24}
              color="#06b6d4"
            />
            <Text style={styles.statNumber}>
              {classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Students</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="file-document"
              size={24}
              color="#ec4899"
            />
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Assignments</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Classes Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Classes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Classes')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {classes.slice(0, 3).map((classItem) => (
          <Card
            key={classItem.id}
            style={styles.classCard}
            onPress={() =>
              navigation.navigate('ClassDetails', { classId: classItem.id })
            }
          >
            <Card.Content>
              <Text style={styles.className}>{classItem.name}</Text>
              <Text style={styles.classSubject}>{classItem.subject}</Text>
              <View style={styles.classFooter}>
                <Text style={styles.studentCount}>
                  {classItem.studentCount || 0} students
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#9ca3af"
                />
              </View>
            </Card.Content>
          </Card>
        ))}
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
    backgroundColor: '#faf5ff',
    borderColor: '#8b5cf6',
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
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  seeAll: {
    color: '#8b5cf6',
    fontWeight: '500',
  },
  classCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
    elevation: 2,
    borderRadius: 8,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  classSubject: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  studentCount: {
    fontSize: 12,
    color: '#9ca3af',
  },

});

export default TeacherDashboardScreen;
