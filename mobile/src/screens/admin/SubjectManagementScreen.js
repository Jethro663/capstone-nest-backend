import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { Card, Button, TextInput } from 'react-native-paper';
import { adminService } from '../../services';

const SubjectManagementScreen = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await adminService.getSubjects();
      setSubjects(response);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;

    try {
      const response = await adminService.createSubject({
        name: newSubjectName,
      });
      setSubjects([...subjects, response]);
      setNewSubjectName('');
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create subject:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subject Management</Text>
        <Text style={styles.subtitle}>
          {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {showForm && (
        <Card style={styles.formCard}>
          <Card.Content>
            <TextInput
              label="Subject Name"
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              style={styles.input}
            />
            <View style={styles.formActions}>
              <Button
                mode="outlined"
                onPress={() => setShowForm(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateSubject}
                style={styles.submitButton}
              >
                Create
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {!showForm && (
        <View style={styles.addButton}>
          <Button
            mode="contained"
            onPress={() => setShowForm(true)}
          >
            Add Subject
          </Button>
        </View>
      )}

      <View style={styles.subjectList}>
        {subjects.map((subject) => (
          <Card key={subject.id} style={styles.subjectCard}>
            <Card.Content>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <Text style={styles.subjectId}>ID: {subject.id}</Text>
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
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formCard: {
    margin: 16,
    backgroundColor: '#f9fafb',
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  subjectList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  subjectCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  subjectId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});

export default SubjectManagementScreen;
