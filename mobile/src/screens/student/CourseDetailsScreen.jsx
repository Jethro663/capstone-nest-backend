import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { lessonService, assessmentService } from '../../services/index';

const CourseDetailsScreen = ({ route, navigation }) => {
  const { courseId } = route.params;
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lessons');
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [completions, setCompletions] = useState({});
  const [studentAttempts, setStudentAttempts] = useState({});

  useEffect(() => {
    loadCourseDetails();
  }, [courseId]);

  const loadCourseDetails = async () => {
    setLoading(true);
    try {
      // Fetch course details
      const courseRes = await api.get(`/classes/${courseId}`);
      console.log('Course details response:', courseRes);
      if (courseRes?.data?.data) {
        const c = courseRes.data.data;
        setCourse({
          id: c.id,
          name: c.subjectName ? `${c.subjectName} (${(c.subjectCode || '').toUpperCase()})` : (c.name || 'Unknown'),
          teacher: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'Unknown',
          grade: c.subjectGradeLevel ? `Grade ${c.subjectGradeLevel}` : (c.section?.gradeLevel ? `Grade ${c.section.gradeLevel}` : 'Grade —'),
          students: Array.isArray(c.enrollments) ? c.enrollments.length : 0,
          schedule: c.schedule || '—',
        });
      }

      // Fetch lessons
      const lessonsRes = await lessonService.getLessonsByClass(courseId);
      if (lessonsRes?.data && Array.isArray(lessonsRes.data)) {
        setLessons(lessonsRes.data);

        // Fetch completions
        const completionsRes = await lessonService.getCompletedLessonsForClass(courseId);
        if (completionsRes?.data && Array.isArray(completionsRes.data)) {
          const completionMap = {};
          completionsRes.data.forEach(completion => {
            completionMap[completion.lessonId] = true;
          });
          setCompletions(completionMap);
        }
      }

      // Fetch assessments
      const assessmentsRes = await assessmentService.getAssessmentsByClass(courseId);
      if (assessmentsRes?.data && Array.isArray(assessmentsRes.data)) {
        const published = assessmentsRes.data.filter(a => a.isPublished !== false);
        setAssessments(published);

        // Fetch attempts for each assessment
        published.forEach(async (assessment) => {
          try {
            const attemptsRes = await assessmentService.getStudentAttempts(assessment.id);
            if (attemptsRes?.data && Array.isArray(attemptsRes.data)) {
              setStudentAttempts(prev => ({
                ...prev,
                [assessment.id]: attemptsRes.data,
              }));
            }
          } catch (err) {
            console.error('Failed to load assessment attempts', err);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load course details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLessonPress = (lesson) => {
    navigation.navigate('StudentLessonViewer', { 
      lesson,
      courseId,
      allLessons: lessons,
    });
  };

  const handleAssessmentPress = (assessment) => {
    navigation.navigate('StudentAssessment', {
      assessment,
      courseId,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Loading...</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Course not found</Text>
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
          <Text style={styles.title}>{course.name}</Text>
          <Text style={styles.subtitle}>{course.teacher}</Text>
        </View>
      </View>

      <View style={styles.courseInfo}>
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="account-multiple" size={20} color="#3b82f6" />
          <View>
            <Text style={styles.infoLabel}>Students</Text>
            <Text style={styles.infoValue}>{course.students}</Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="book-outline" size={20} color="#8b5cf6" />
          <View>
            <Text style={styles.infoLabel}>Lessons</Text>
            <Text style={styles.infoValue}>{lessons.length}</Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="file-outline" size={20} color="#10b981" />
          <View>
            <Text style={styles.infoLabel}>Assessments</Text>
            <Text style={styles.infoValue}>{assessments.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lessons' && styles.activeTab]}
          onPress={() => setActiveTab('lessons')}
        >
          <Text style={[styles.tabText, activeTab === 'lessons' && styles.activeTabText]}>
            Lessons ({lessons.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assessments' && styles.activeTab]}
          onPress={() => setActiveTab('assessments')}
        >
          <Text style={[styles.tabText, activeTab === 'assessments' && styles.activeTabText]}>
            Assessments ({assessments.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'lessons' && (
          <View>
            {lessons.length > 0 ? (
              lessons.map((lesson, index) => (
                <TouchableOpacity
                  key={lesson.id}
                  style={styles.lessonCard}
                  onPress={() => handleLessonPress(lesson)}
                >
                  <View style={styles.lessonHeader}>
                    <View style={styles.lessonNumber}>
                      <Text style={styles.lessonNumberText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lessonTitle}>{lesson.title || lesson.name}</Text>
                      {completions[lesson.id] && (
                        <View style={styles.completedBadge}>
                          <MaterialCommunityIcons name="check-circle" size={14} color="#10b981" />
                          <Text style={styles.completedText}>Completed</Text>
                        </View>
                      )}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="book-open-blank-variant" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No lessons available</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'assessments' && (
          <View>
            {assessments.length > 0 ? (
              assessments.map((assessment, index) => {
                const attempts = studentAttempts[assessment.id] || [];
                const hasAttempts = attempts.length > 0;

                return (
                  <TouchableOpacity
                    key={assessment.id}
                    style={styles.assessmentCard}
                    onPress={() => handleAssessmentPress(assessment)}
                  >
                    <View style={styles.assessmentHeader}>
                      <View style={styles.assessmentType}>
                        <MaterialCommunityIcons name="file-document" size={20} color="#dc2626" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assessmentTitle}>{assessment.title}</Text>
                        <View style={styles.assessmentMeta}>
                          <View style={styles.metaItem}>
                            <MaterialCommunityIcons name="help-box" size={14} color="#6b7280" />
                            <Text style={styles.metaText}>{assessment.questions?.length || 0} questions</Text>
                          </View>
                          {hasAttempts && (
                            <View style={styles.metaItem}>
                              <MaterialCommunityIcons name="check-all" size={14} color="#10b981" />
                              <Text style={styles.metaText}>{attempts.length} attempt{attempts.length !== 1 ? 's' : ''}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="file-document-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No assessments available</Text>
              </View>
            )}
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  courseInfo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 3,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lessonCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lessonNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  lessonNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  completedText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  assessmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assessmentType: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  assessmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  assessmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#6b7280',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
});

export default CourseDetailsScreen;
 