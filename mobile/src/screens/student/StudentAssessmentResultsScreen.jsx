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

const StudentAssessmentResultsScreen = ({ route, navigation }) => {
  const { attempt, assessment } = route.params;
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [attempt.id]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getAttemptResults(attempt.id);
      if (res?.data) {
        setResultData(res.data);
      }
    } catch (err) {
      console.error('Failed to load results', err);
    } finally {
      setLoading(false);
    }
  };

  const getFeedbackStatus = () => {
    if (!resultData) return 'locked';
    if (resultData.isUnlocked || resultData.feedbackUnlocked) return 'unlocked';
    if (resultData.feedbackLocked) return 'locked';
    return 'processing';
  };

  const getFeedbackMessage = (status) => {
    switch (status) {
      case 'unlocked':
        return 'Feedback has been reviewed';
      case 'locked':
        return 'Feedback will be available soon';
      case 'processing':
        return 'Your submission is being reviewed';
      default:
        return '';
    }
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

  const feedbackStatus = getFeedbackStatus();

  if (!resultData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>{assessment.title}</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#9ca3af' }}>Failed to load results</Text>
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
          <Text style={styles.headerSubtitle}>Results</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>
              {resultData.obtainedScore !== undefined
                ? Math.round(resultData.obtainedScore)
                : '—'}
              %
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Out of</Text>
            <Text style={styles.scoreValue}>
              {resultData.totalScore || '100'}%
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor:
                resultData.isPassed || (resultData.obtainedScore >= 50)
                  ? '#f0fdf4'
                  : '#fef2f2',
              borderColor:
                resultData.isPassed || (resultData.obtainedScore >= 50)
                  ? '#bbf7d0'
                  : '#fecaca',
            },
          ]}
        >
          <MaterialCommunityIcons
            name={resultData.isPassed || (resultData.obtainedScore >= 50) ? 'check-circle' : 'close-circle'}
            size={24}
            color={
              resultData.isPassed || (resultData.obtainedScore >= 50)
                ? '#10b981'
                : '#dc2626'
            }
          />
          <Text
            style={[
              styles.statusText,
              {
                color:
                  resultData.isPassed || (resultData.obtainedScore >= 50)
                    ? '#10b981'
                    : '#dc2626',
              },
            ]}
          >
            {resultData.isPassed || (resultData.obtainedScore >= 50)
              ? 'Passed'
              : 'Needs Improvement'}
          </Text>
        </View>

        {/* Feedback Banner */}
        <View
          style={[
            styles.feedbackBanner,
            {
              backgroundColor:
                feedbackStatus === 'unlocked'
                  ? '#f0fdf4'
                  : feedbackStatus === 'locked'
                  ? '#fef3c7'
                  : '#eff6ff',
              borderColor:
                feedbackStatus === 'unlocked'
                  ? '#bbf7d0'
                  : feedbackStatus === 'locked'
                  ? '#fde68a'
                  : '#bfdbfe',
            },
          ]}
        >
          <MaterialCommunityIcons
            name={
              feedbackStatus === 'unlocked'
                ? 'check-circle'
                : feedbackStatus === 'locked'
                ? 'clock-outline'
                : 'information-outline'
            }
            size={20}
            color={
              feedbackStatus === 'unlocked'
                ? '#10b981'
                : feedbackStatus === 'locked'
                ? '#92400e'
                : '#1e40af'
            }
          />
          <Text
            style={[
              styles.feedbackMessage,
              {
                color:
                  feedbackStatus === 'unlocked'
                    ? '#10b981'
                    : feedbackStatus === 'locked'
                    ? '#92400e'
                    : '#1e40af',
              },
            ]}
          >
            {getFeedbackMessage(feedbackStatus)}
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
              <Text style={styles.summaryLabel}>Correct</Text>
              <Text style={styles.summaryValue}>{resultData.correctCount || 0}</Text>
            </View>
            <View style={styles.summaryCard}>
              <MaterialCommunityIcons name="close-circle" size={24} color="#dc2626" />
              <Text style={styles.summaryLabel}>Incorrect</Text>
              <Text style={styles.summaryValue}>{resultData.incorrectCount || 0}</Text>
            </View>
            <View style={styles.summaryCard}>
              <MaterialCommunityIcons name="help-circle" size={24} color="#f97316" />
              <Text style={styles.summaryLabel}>Unanswered</Text>
              <Text style={styles.summaryValue}>{resultData.unansweredCount || 0}</Text>
            </View>
          </View>
        </View>

        {/* Question Review */}
        {resultData.questionResults && resultData.questionResults.length > 0 && (
          <View style={styles.questionReviewSection}>
            <Text style={styles.sectionTitle}>Question Review</Text>

            {resultData.questionResults.map((qResult, index) => {
              const isCorrect = qResult.isCorrect;
              return (
                <View
                  key={qResult.questionId}
                  style={[
                    styles.questionCard,
                    {
                      borderColor: isCorrect ? '#d1fae5' : '#fee2e2',
                      backgroundColor: isCorrect ? '#f0fdf4' : '#fef2f2',
                    },
                  ]}
                >
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionNumber}>Question {index + 1}</Text>
                    <MaterialCommunityIcons
                      name={isCorrect ? 'check-circle' : 'close-circle'}
                      size={20}
                      color={isCorrect ? '#10b981' : '#dc2626'}
                    />
                  </View>

                  <Text style={styles.questionText}>{qResult.question}</Text>

                  {qResult.studentAnswer && (
                    <View style={styles.answerBox}>
                      <Text style={styles.answerLabel}>Your Answer:</Text>
                      <Text style={styles.answerText}>{qResult.studentAnswer}</Text>
                    </View>
                  )}

                  {qResult.correctAnswer && !isCorrect && (
                    <View style={styles.correctBox}>
                      <Text style={styles.answerLabel}>Correct Answer:</Text>
                      <Text style={styles.answerText}>{qResult.correctAnswer}</Text>
                    </View>
                  )}

                  {qResult.feedback && (
                    <View style={styles.feedbackBox}>
                      <MaterialCommunityIcons name="comment-text" size={16} color="#6b7280" />
                      <Text style={styles.feedbackText}>{qResult.feedback}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Back to Assessment</Text>
          </TouchableOpacity>
        </View>
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
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#3b82f6',
  },
  divider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  feedbackMessage: {
    fontSize: 13,
    fontWeight: '500',
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 4,
  },
  questionReviewSection: {
    marginBottom: 24,
  },
  questionCard: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    lineHeight: 20,
  },
  answerBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 6,
    marginBottom: 10,
  },
  correctBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    marginBottom: 10,
  },
  answerLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  answerText: {
    fontSize: 13,
    color: '#1f2937',
    lineHeight: 18,
  },
  feedbackBox: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    gap: 10,
    alignItems: 'flex-start',
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  actionSection: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default StudentAssessmentResultsScreen;
