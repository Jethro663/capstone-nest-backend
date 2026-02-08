import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
} from 'react-native';
import { Card, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { userService, profilesService } from '../../services';

const ProfileScreen = () => {
  const { user, refreshUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [savingProfile, setSavingProfile] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    middleName: '',
    lastName: user?.lastName || '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    gradeLevel: '',
  });

  const [familyData, setFamilyData] = useState({
    familyName: '',
    familyRelationship: '',
    familyContact: '',
  });

  useEffect(() => {
    if (user?.userId) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await profilesService.getProfileByUserId(user.userId);
      const profileData = res?.data || res || null;
      if (profileData) {
        setProfile(profileData);
        // Merge user and profile data
        const src = { ...user, ...profileData };
        setFormData({
          firstName: src.firstName || '',
          middleName: src.middleName || '',
          lastName: src.lastName || '',
          dateOfBirth: src.dateOfBirth || src.dob || '',
          gender: src.gender || '',
          phone: src.phone || '',
          address: src.address || '',
          gradeLevel: src.gradeLevel || src.grade || '',
        });
        setFamilyData({
          familyName: src.familyName || '',
          familyRelationship: src.familyRelationship || '',
          familyContact: src.familyContact || '',
        });
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await profilesService.updateProfile({
        ...formData,
        ...familyData,
      });
      await loadProfile();
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  const fullName = `${formData.firstName} ${formData.middleName ? (formData.middleName + ' ') : ''}${formData.lastName}`.trim();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView>
        {/* Profile Header */}
        <Card style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons
                name="account-circle"
                size={80}
                color="#3b82f6"
              />
            </View>
            <Text style={styles.profileName}>
              {fullName || user?.email}
            </Text>
            <Text style={styles.profileRole}>{user?.role}</Text>
            {formData.gradeLevel && (
              <Text style={styles.profileGrade}>{formData.gradeLevel}</Text>
            )}
          </Card.Content>
        </Card>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
              About Me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'family' && styles.activeTab]}
            onPress={() => setActiveTab('family')}
          >
            <Text style={[styles.tabText, activeTab === 'family' && styles.activeTabText]}>
              Family
            </Text>
          </TouchableOpacity>
        </View>

        {/* About Tab */}
        {activeTab === 'about' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <Button
                mode="text"
                onPress={() => setEditing(!editing)}
                compact
              >
                {editing ? 'Cancel' : 'Edit'}
              </Button>
            </View>

            <Card>
              <Card.Content style={styles.formContent}>
                <TextInput
                  label="First Name"
                  value={formData.firstName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, firstName: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Middle Name"
                  value={formData.middleName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, middleName: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Last Name"
                  value={formData.lastName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, lastName: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Email"
                  value={user?.email || ''}
                  editable={false}
                  style={styles.input}
                />

                <TextInput
                  label="Date of Birth"
                  value={formData.dateOfBirth}
                  onChangeText={(text) =>
                    setFormData({ ...formData, dateOfBirth: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Gender"
                  value={formData.gender}
                  onChangeText={(text) =>
                    setFormData({ ...formData, gender: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Phone"
                  value={formData.phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Address"
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                  editable={editing}
                  multiline
                  style={styles.input}
                />

                <TextInput
                  label="Grade Level"
                  value={formData.gradeLevel}
                  onChangeText={(text) =>
                    setFormData({ ...formData, gradeLevel: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                {editing && (
                  <Button
                    mode="contained"
                    onPress={handleSaveProfile}
                    loading={savingProfile}
                    disabled={savingProfile}
                    style={styles.saveButton}
                  >
                    Save Changes
                  </Button>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Family Tab */}
        {activeTab === 'family' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Family Information</Text>
              <Button
                mode="text"
                onPress={() => setEditing(!editing)}
                compact
              >
                {editing ? 'Cancel' : 'Edit'}
              </Button>
            </View>

            <Card>
              <Card.Content style={styles.formContent}>
                <TextInput
                  label="Family Member Name"
                  value={familyData.familyName}
                  onChangeText={(text) =>
                    setFamilyData({ ...familyData, familyName: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Relationship"
                  value={familyData.familyRelationship}
                  onChangeText={(text) =>
                    setFamilyData({ ...familyData, familyRelationship: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Contact Number"
                  value={familyData.familyContact}
                  onChangeText={(text) =>
                    setFamilyData({ ...familyData, familyContact: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                {editing && (
                  <Button
                    mode="contained"
                    onPress={handleSaveProfile}
                    loading={savingProfile}
                    disabled={savingProfile}
                    style={styles.saveButton}
                  >
                    Save Changes
                  </Button>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Account Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <Card>
            <Card.Content style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Role:</Text>
                <Text style={styles.detailValue}>{user?.role}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Joined:</Text>
                <Text style={styles.detailValue}>
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, styles.statusActive]}>
                  Active
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <Button
            mode="outlined"
            onPress={logout}
            style={styles.logoutButton}
            labelStyle={styles.logoutButtonLabel}
          >
            Logout
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerCard: {
    margin: 16,
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 1,
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profileRole: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  profileGrade: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#dc2626',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#dc2626',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  formContent: {
    gap: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
  },
  saveButton: {
    marginTop: 12,
  },
  details: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
  statusActive: {
    color: '#16a34a',
  },
  logoutButton: {
    borderColor: '#dc2626',
    borderWidth: 2,
    marginBottom: 24,
  },
  logoutButtonLabel: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
