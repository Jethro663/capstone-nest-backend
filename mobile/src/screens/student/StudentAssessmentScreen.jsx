import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { assessmentService } from '../../services/index';

const StudentAssessmentScreen = ({ route, navigation }) => {
  const { assessment, courseId } = route.params;
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttempts();
  }, [assessment.id]);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getStudentAttempts(assessment.id);
      if (res?.data && Array.isArray(res.data)) {
        setAttempts(res.data);
      }
    } catch (err) {
      console.error('Failed to load attempts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAttempt = async () => {
    try {
      const res = await assessmentService.startAttempt(assessment.id);
      if (res?.data) {
        navigation.navigate('StudentAssessmentTaking', {
          assessment,
          attempt: res.data,
          courseId,
        });
      }
    } catch (err) {
      console.error('Failed to start attempt', err);
    }
  };

  const handleViewResults = (attempt) => {
    navigation.navigate('StudentAssessmentResults', {
      attempt,
      assessment,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Loading...</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>{assessment.title}</Text>
          <Text style={styles.headerSubtitle}>Assessment</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Assessment Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="help-box" size={24} color="#3b82f6" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Questions</Text>
              <Text style={styles.infoValue}>
                {assessment.questions?.length || 0}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="file-document" size={24} color="#8b5cf6" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{assessment.type || 'Standard'}</Text>
            </View>
          </View>
        </View>

        {/* Start Assessment Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartAttempt}
        >
          <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
          <Text style={styles.startButtonText}>Start Assessment</Text>
        </TouchableOpacity>

        {/* Attempts Section */}
        {attempts.length > 0 && (
          <View style={styles.attemptsSection}>
            <Text style={styles.sectionTitle}>Your Attempts</Text>

            {attempts.map((attempt, index) => (
              <TouchableOpacity
                key={attempt.id}
                style={styles.attemptCard}
                onPress={() => handleViewResults(attempt)}
              >
                <View style={styles.attemptHeader}>
                  <View>
                    <Text style={styles.attemptNumber}>Attempt {index + 1}</Text>
                    <Text style={styles.attemptDate}>
                      {new Date(attempt.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.attemptScore}>
                    <Text style={styles.scoreValue}>
                      {attempt.score !== undefined ? Math.round(attempt.score) : '—'}%
                    </Text>
                  </View>
                </View>

                {attempt.feedback && (
                  <View style={styles.attemptFeedback}>
                    <MaterialCommunityIcons name="information" size={16} color="#6b7280" />
                    <Text style={styles.feedbackText}>{attempt.feedback}</Text>
                  </View>
                )}

                <View style={styles.attemptFooter}>
                  <View style={styles.statusBadge}>
                    {attempt.isCompleted ? (
                      <>
                        <MaterialCommunityIcons name="check-circle" size={14} color="#10b981" />
                        <Text style={styles.statusText}>Completed</Text>
                      </>
                    ) : (
                      <>
                        <MaterialCommunityIcons name="progress-check" size={14} color="#f97316" />
                        <Text style={styles.statusText}>In Progress</Text>
                      </>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Attempts Message */}
        {attempts.length === 0 && (
          <View style={styles.noAttemptsSection}>
            <MaterialCommunityIcons name="clipboard-outline" size={48} color="#d1d5db" />
            <Text style={styles.noAttemptsText}>No attempts yet</Text>
            <Text style={styles.noAttemptsSubtext}>Start the assessment to begin</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  attemptsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  attemptCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  attemptNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  attemptDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  attemptScore: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
  },
  attemptFeedback: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    marginBottom: 10,
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  attemptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  noAttemptsSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noAttemptsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
  },
  noAttemptsSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
});

export default StudentAssessmentScreen;
