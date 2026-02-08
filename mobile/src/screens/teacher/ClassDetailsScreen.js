import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { teacherService } from '../../services';

const ClassDetailsScreen = ({ route }) => {
  const { classId } = route.params;
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClass();
  }, [classId]);

  const loadClass = async () => {
    try {
      const response = await teacherService.getClassDetails(classId);
      setClassData(response);
    } catch (error) {
      console.error('Failed to load class:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!classData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text style={styles.title}>{classData.name}</Text>
          <Text style={styles.subject}>{classData.subject}</Text>
        </Card.Content>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Class Information</Text>
        <Card>
          <Card.Content style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Section:</Text>
              <Text style={styles.detailValue}>{classData.section}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Students:</Text>
              <Text style={styles.detailValue}>
                {classData.studentCount || 0}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Semester:</Text>
              <Text style={styles.detailValue}>{classData.semester}</Text>
            </View>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Card>
          <Card.Content>
            <Text style={styles.description}>
              {classData.description || 'No description available'}
            </Text>
          </Card.Content>
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
    backgroundColor: '#faf5ff',
    borderColor: '#8b5cf6',
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subject: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  details: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default ClassDetailsScreen;
