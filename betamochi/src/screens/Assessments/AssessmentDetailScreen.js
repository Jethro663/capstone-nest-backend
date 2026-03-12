import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAssessmentById, getDifficultyColor, getDifficultyEmoji } from '../../services/mockData';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/commonStyles';

const AssessmentDetailScreen = ({ route, navigation }) => {
  const { assessment: initialAssessment } = route.params;
  const [assessment, setAssessment] = useState(initialAssessment);
  const [loading, setLoading] = useState(!initialAssessment);

  useEffect(() => {
    if (!initialAssessment) {
      loadAssessment();
    }
  }, []);

  const loadAssessment = async () => {
    try {
      const data = await getAssessmentById(route.params?.id);
      setAssessment(data);
    } catch (error) {
      console.error('Failed to load assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !assessment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const completionPercentage = Math.round(
    (assessment.completedQuestions / assessment.totalQuestions) * 100
  );

  const difficultyColor = getDifficultyColor(assessment.difficulty);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerBadge}>
            <MaterialCommunityIcons
              name="clipboard-check"
              size={24}
              color={colors.white}
            />
          </View>

          <Text style={styles.assessmentTitle}>{assessment.title}</Text>
          <Text style={styles.assessmentSubject}>{assessment.subject}</Text>
          <Text style={styles.assessmentDescription}>{assessment.description}</Text>

          <View style={styles.difficultyBadge}>
            <MaterialCommunityIcons
              name="star"
              size={14}
              color={difficultyColor}
            />
            <Text style={[styles.difficultyText, { color: difficultyColor }]}>
              {assessment.difficulty}
            </Text>
            <Text style={[styles.difficultyEmoji, { color: difficultyColor }]}>
              {getDifficultyEmoji(assessment.difficulty)}
            </Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Progress</Text>

          <View style={styles.progressItem}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Completion</Text>
              <Text style={styles.progressValue}>{completionPercentage}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${completionPercentage}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="help-circle-outline"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.statValue}>{assessment.totalQuestions}</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={24}
                color={colors.success}
              />
              <Text style={styles.statValue}>{assessment.completedQuestions}</Text>
              <Text style={styles.statLabel}>Answered</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={24}
                color={colors.warning}
              />
              <Text style={styles.statValue}>{assessment.timeLimit}</Text>
              <Text style={styles.statLabel}>Min Limit</Text>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Assessment Details</Text>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="calendar"
              size={18}
              color={colors.primary}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>
                {new Date(assessment.dueDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="timer"
              size={18}
              color={colors.primary}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time Limit</Text>
              <Text style={styles.detailValue}>{assessment.timeLimit} minutes</Text>
            </View>
          </View>

          {assessment.isCompleted && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="trophy"
                size={18}
                color={colors.warning}
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Your Score</Text>
                <Text style={styles.detailValue}>{assessment.score}%</Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={18}
              color={colors.primary}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color: assessment.isCompleted ? colors.success : colors.accent,
                  },
                ]}
              >
                {assessment.isCompleted ? 'Completed' : 'In Progress'}
              </Text>
            </View>
          </View>
        </View>

        {/* Instructions Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Instructions</Text>

          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>1</Text>
            </View>
            <Text style={styles.instructionText}>
              Read each question carefully before answering
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>2</Text>
            </View>
            <Text style={styles.instructionText}>
              You can go back and review your answers
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>3</Text>
            </View>
            <Text style={styles.instructionText}>
              Your progress will be automatically saved
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>4</Text>
            </View>
            <Text style={styles.instructionText}>
              Try to submit before the due date
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {!assessment.isCompleted ? (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="play-circle-outline"
                  size={18}
                  color={colors.white}
                />
                <Text style={styles.primaryButtonText}>Continue Assessment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="bookmark-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>Save for Later</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="eye-check-outline"
                  size={18}
                  color={colors.white}
                />
                <Text style={styles.primaryButtonText}>View Results in Detail</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="replay"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>Retake Assessment</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerBadge: {
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  assessmentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  assessmentSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  assessmentDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundLight,
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: spacing.xs,
  },
  difficultyEmoji: {
    marginLeft: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  progressItem: {
    marginBottom: spacing.lg,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginVertical: spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.secondaryLight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondaryLight,
  },
  detailContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  instructionNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
});

export default AssessmentDetailScreen;
