import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Card } from 'react-native-paper';
import { teacherService } from '../../services';

const TeacherClassesScreen = ({ navigation }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await teacherService.getTeacherClasses();
      setClasses(response);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Classes</Text>
        <Text style={styles.subtitle}>
          {classes.length} class{classes.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      <View style={styles.classList}>
        {classes.map((classItem) => (
          <TouchableOpacity
            key={classItem.id}
            style={styles.classItem}
            onPress={() =>
              navigation.navigate('ClassDetails', { classId: classItem.id })
            }
          >
            <View style={styles.classContent}>
              <Text style={styles.className}>{classItem.name}</Text>
              <Text style={styles.classSubject}>{classItem.subject}</Text>
              <View style={styles.classFooter}>
                <Text style={styles.studentCount}>
                  {classItem.studentCount || 0} students
                </Text>
                <Text style={styles.classSection}>
                  Section: {classItem.section}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
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
  classList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  classItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  classContent: {
    gap: 8,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  classSubject: {
    fontSize: 14,
    color: '#6b7280',
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  studentCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  classSection: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '600',
  },
});

export default TeacherClassesScreen;
