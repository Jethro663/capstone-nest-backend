import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { assessmentService } from '../../services/index';

const StudentAssessmentTakingScreen = ({ route, navigation }) => {
  const { assessment, attempt, courseId } = route.params;
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [responses, setResponses] = useState(attempt.responses || {});
  const [submitting, setSubmitting] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const questions = assessment.questions || [];
  const currentQuestion = questions[currentQuestionIdx];
  const isLastQuestion = currentQuestionIdx === questions.length - 1;
  const isFirstQuestion = currentQuestionIdx === 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAnswerChange = (questionId, answer) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmitAssessment = async () => {
    const allAnswered = questions.every(q => responses[q.id] !== undefined && responses[q.id] !== '');
    if (!allAnswered) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const responseArray = questions.map(q => {
        const answer = responses[q.id];
        return {
          questionId: q.id,
          studentAnswer: q.type === 'short_answer' || q.type === 'fill_blank' ? answer : undefined,
          selectedOptionId: ['multiple_choice', 'true_false', 'dropdown'].includes(q.type) ? answer : undefined,
          selectedOptionIds: q.type === 'multiple_select' ? (Array.isArray(answer) ? answer : []) : undefined,
        };
      });

      await assessmentService.submitAssessment({
        assessmentId: assessment.id,
        responses: responseArray,
        timeSpentSeconds: timeElapsed,
      });

      Alert.alert('Success', 'Assessment submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('StudentAssessment', { assessment, courseId });
          },
        },
      ]);
    } catch (err) {
      console.error('Failed to submit assessment', err);
      Alert.alert('Error', 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
      setShowConfirmSubmit(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    const value = responses[currentQuestion.id] || '';

    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  value === option.id && styles.selectedOption,
                ]}
                onPress={() => handleAnswerChange(currentQuestion.id, option.id)}
              >
                <View
                  style={[
                    styles.radioButton,
                    value === option.id && styles.radioButtonSelected,
                  ]}
                >
                  {value === option.id && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.optionText, value === option.id && styles.selectedOptionText]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'multiple_select':
        const selectedIds = Array.isArray(value) ? value : [];
        return (
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  selectedIds.includes(option.id) && styles.selectedOption,
                ]}
                onPress={() => {
                  if (selectedIds.includes(option.id)) {
                    handleAnswerChange(currentQuestion.id, selectedIds.filter(id => id !== option.id));
                  } else {
                    handleAnswerChange(currentQuestion.id, [...selectedIds, option.id]);
                  }
                }}
              >
                <View
                  style={[
                    styles.checkButton,
                    selectedIds.includes(option.id) && styles.checkButtonSelected,
                  ]}
                >
                  {selectedIds.includes(option.id) && (
                    <MaterialCommunityIcons name="check" size={16} color="#dc2626" />
                  )}
                </View>
                <Text
                  style={[styles.optionText, selectedIds.includes(option.id) && styles.selectedOptionText]}
                >
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'true_false':
        return (
          <View style={styles.optionsContainer}>
            {[
              { id: 'true', text: 'True' },
              { id: 'false', text: 'False' },
            ].map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  value === option.id && styles.selectedOption,
                ]}
                onPress={() => handleAnswerChange(currentQuestion.id, option.id)}
              >
                <View
                  style={[
                    styles.radioButton,
                    value === option.id && styles.radioButtonSelected,
                  ]}
                >
                  {value === option.id && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.optionText, value === option.id && styles.selectedOptionText]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'short_answer':
      case 'fill_blank':
        return (
          <TextInput
            style={styles.textInput}
            placeholder="Enter your answer"
            value={value}
            onChangeText={(text) => handleAnswerChange(currentQuestion.id, text)}
            multiline
          />
        );

      default:
        return null;
    }
  };

  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <Text>No questions available</Text>
      </View>
    );
  }

  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{assessment.title}</Text>
          <Text style={styles.headerSubtitle}>
            Question {currentQuestionIdx + 1} of {questions.length}
          </Text>
        </View>
        <View style={styles.timer}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#6b7280" />
          <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.questionSection}>
          <Text style={styles.questionNumber}>
            Question {currentQuestionIdx + 1}
          </Text>
          <Text style={styles.questionText}>{currentQuestion.text || currentQuestion.question}</Text>

          {currentQuestion.type === 'multiple_choice' ||
            currentQuestion.type === 'multiple_select' ||
            currentQuestion.type === 'true_false' ? (
            renderQuestionInput()
          ) : (
            renderQuestionInput()
          )}
        </View>
      </ScrollView>

      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={[styles.navButton, isFirstQuestion && styles.navButtonDisabled]}
          onPress={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
          disabled={isFirstQuestion}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={20}
            color={isFirstQuestion ? '#d1d5db' : '#3b82f6'}
          />
          <Text style={[styles.navButtonText, isFirstQuestion && styles.navButtonDisabledText]}>
            Previous
          </Text>
        </TouchableOpacity>

        {isLastQuestion ? (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={() => setShowConfirmSubmit(true)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentQuestionIdx(Math.min(questions.length - 1, currentQuestionIdx + 1))}
          >
            <Text style={styles.navButtonText}>Next</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#dc2626" />
            <Text style={styles.modalTitle}>Submit Assessment?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to submit? You won't be able to change your answers after submitting.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmSubmit(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSubmitAssessment}
              >
                <Text style={styles.confirmButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  questionSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
    gap: 12,
  },
  selectedOption: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#dc2626',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc2626',
  },
  checkButton: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonSelected: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  selectedOptionText: {
    color: '#1f2937',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  navigationBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    backgroundColor: '#fff',
    gap: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
    borderColor: '#e5e7eb',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  navButtonDisabledText: {
    color: '#d1d5db',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#dc2626',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default StudentAssessmentTakingScreen;
