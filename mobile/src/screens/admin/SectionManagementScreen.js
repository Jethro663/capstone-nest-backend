import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { Card, Button, TextInput } from 'react-native-paper';
import { adminService } from '../../services';

const SectionManagementScreen = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSectionName, setNewSectionName] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      const response = await adminService.getSections();
      setSections(response);
    } catch (error) {
      console.error('Failed to load sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;

    try {
      const response = await adminService.createSection({
        name: newSectionName,
      });
      setSections([...sections, response]);
      setNewSectionName('');
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create section:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Section Management</Text>
        <Text style={styles.subtitle}>
          {sections.length} section{sections.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {showForm && (
        <Card style={styles.formCard}>
          <Card.Content>
            <TextInput
              label="Section Name"
              value={newSectionName}
              onChangeText={setNewSectionName}
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
                onPress={handleCreateSection}
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
            Add Section
          </Button>
        </View>
      )}

      <View style={styles.sectionList}>
        {sections.map((section) => (
          <Card key={section.id} style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionName}>{section.name}</Text>
              <Text style={styles.sectionId}>ID: {section.id}</Text>
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
  sectionList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  sectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  sectionId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});

export default SectionManagementScreen;
