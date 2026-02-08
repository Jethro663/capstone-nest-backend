import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { lessonService } from '../../services/index';
import api from '../../services/api';

const StudentCoursesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completions, setCompletions] = useState({});
  const [lessonErrors, setLessonErrors] = useState({});

  useEffect(() => {
    if (user?.userId) {
      loadCourses();
    }
  }, [user]);

  const loadCourses = async () => {
    console.log('Loading courses for user:', user);
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/classes/student/${user.userId}`);
      if (response?.data?.data && Array.isArray(response.data.data)) {
        const courseList = response.data.data.map(c => ({
          id: c.id,
          name: c.subjectName ? `${c.subjectName} (${(c.subjectCode || '').toUpperCase()})` : (c.name || 'Unknown'),
          grade: c.subjectGradeLevel ? `Grade ${c.subjectGradeLevel}` : (c.section?.gradeLevel ? `Grade ${c.section.gradeLevel}` : 'Grade —'),
          teacher: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'Unknown',
          schedule: c.schedule || '—',
          students: Array.isArray(c.enrollments) ? c.enrollments.length : 0,
          progress: 0,
          color: pickColor(c.subjectCode || c.id),
          lessons: [],
        }));
        setCourses(courseList);
        setLoading(false); // Show UI immediately

        // Load lesson details in background (don't block)
        loadLessonsInBackground(courseList);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
      setError('Could not load courses. Check your connection and try again.');
      setLoading(false);
    }
  };

  const loadLessonsInBackground = async (courseList) => {
    try {
      // Load all lessons in parallel
      await Promise.all(courseList.map(course => loadLessonsForCourse(course)));
    } catch (err) {
      console.error('Background lesson loading error:', err);
    }
  };

  const loadLessonsForCourse = async (course) => {
    try {
      const res = await lessonService.getLessonsByClass(course.id);
      if (res?.data && Array.isArray(res.data)) {
        setCourses(prev => 
          prev.map(c => c.id === course.id ? { ...c, lessons: res.data } : c)
        );

        // Fetch completion status
        const completionRes = await lessonService.getCompletedLessonsForClass(course.id);
        if (completionRes?.data && Array.isArray(completionRes.data)) {
          const completed = completionRes.data.length;
          const total = res.data.length || 0;
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

          setCompletions(prev => ({
            ...prev,
            [course.id]: { completed, total, progress },
          }));

          setCourses(prev =>
            prev.map(c => c.id === course.id ? { ...c, progress } : c)
          );
        }
      }
    } catch (err) {
      console.error(`Failed to load lessons for class ${course.id}`, err);
      setLessonErrors(prev => ({ ...prev, [course.id]: true }));
    }
  };

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F97316', '#EC4899', '#14B8A6', '#64748B'];
  const pickColor = (seed) => {
    if (!seed) return COLORS[0];
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h << 5) - h + seed.charCodeAt(i);
      h |= 0;
    }
    return COLORS[Math.abs(h) % COLORS.length];
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Courses</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Loading...</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          {error && (
            <View style={{ marginTop: 20, width: '100%' }}>
              <View style={{ padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca', marginBottom: 12 }}>
                <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
              </View>
              <TouchableOpacity
                onPress={loadCourses}
                style={{ backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Courses</Text>
        <Text style={styles.subtitle}>
          {courses.length} course{courses.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {error && (
        <View style={{ margin: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' }}>
          <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
          <TouchableOpacity onPress={loadCourses} style={{ marginTop: 8 }}>
            <Text style={{ color: '#3b82f6', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.courseList}>
        {courses.map((course) => (
          <TouchableOpacity
            key={course.id}
            style={[styles.courseItem, { borderLeftColor: course.color }]}
            onPress={() =>
              navigation.navigate('CourseDetails', { courseId: course.id })
            }
          >
            <View style={styles.courseContent}>
              <Text style={styles.courseName}>{course.name}</Text>
              <Text style={styles.courseInstructor}>{course.teacher}</Text>
              <Text style={styles.courseGrade}>{course.grade}</Text>
              <View style={styles.courseFooter}>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${course.progress}%`, backgroundColor: course.color }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{course.progress}% complete</Text>
                </View>
                <View style={styles.courseStats}>
                  <MaterialCommunityIcons name="book-outline" size={14} color="#6b7280" />
                  <Text style={styles.statText}>{course.lessons.length} lessons</Text>
                </View>
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
  courseList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  courseItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  courseContent: {
    gap: 8,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  courseInstructor: {
    fontSize: 13,
    color: '#6b7280',
  },
  courseGrade: {
    fontSize: 12,
    color: '#9ca3af',
  },
  courseFooter: {
    marginTop: 8,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
  },
  courseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default StudentCoursesScreen;
