import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { lessonService, assessmentService } from '../../services/index';

const StudentDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCourses: 0,
    lessonsCompleted: 0,
    assessmentsTaken: 0,
    averageScore: 0,
  });

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: () => logout(),
          style: 'destructive',
        },
      ]
    );
  }, [logout]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: 12 }}>
          <MaterialCommunityIcons name="logout" size={24} color="#dc2626" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleLogout]);

  useEffect(() => {
    if (user?.userId) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const coursesRes = await api.get(`/classes/student/${user.userId}`);

      if (coursesRes?.data?.data && Array.isArray(coursesRes.data.data)) {
        const courseList = coursesRes.data.data.map(c => ({
          id: c.id,
          name: c.subjectName ? `${c.subjectName} (${(c.subjectCode || '').toUpperCase()})` : (c.name || 'Unknown'),
          teacher: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'Unknown',
          progress: 0,
          color: pickColor(c.subjectCode || c.id),
        }));
        setCourses(courseList);
        setStats(prev => ({ ...prev, totalCourses: courseList.length }));

        // Load detailed stats in background (don't block UI)
        loadStatsInBackground(courseList);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Could not load courses. Check your connection and try again.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStatsInBackground = async (courseList) => {
    try {
      let totalLessonsCompleted = 0;
      let totalAssessmentsTaken = 0;
      let totalScores = 0;
      let scoreCount = 0;

      for (const course of courseList) {
        try {
          // Get lessons progress
          const lessonsRes = await Promise.race([
            lessonService.getLessonsByClass(course.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);

          const completedRes = await Promise.race([
            lessonService.getCompletedLessonsForClass(course.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
          
          if (lessonsRes?.data && Array.isArray(lessonsRes.data)) {
            const total = lessonsRes.data.length || 0;
            const completed = completedRes?.data ? completedRes.data.length : 0;
            totalLessonsCompleted += completed;
            
            setCourses(prev => prev.map(c => 
              c.id === course.id ? { ...c, progress: total > 0 ? Math.round((completed / total) * 100) : 0 } : c
            ));
          }
        } catch (err) {
          console.log(`Skipping lessons for course ${course.id}:`, err.message);
        }

        try {
          // Get assessments progress
          const assessmentsRes = await Promise.race([
            assessmentService.getAssessmentsByClass(course.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);

          if (assessmentsRes?.data && Array.isArray(assessmentsRes.data)) {
            const published = assessmentsRes.data.filter(a => a.isPublished !== false);
            
            for (const assessment of published) {
              try {
                const attemptsRes = await Promise.race([
                  assessmentService.getStudentAttempts(assessment.id),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
                ]);

                if (attemptsRes?.data && Array.isArray(attemptsRes.data)) {
                  totalAssessmentsTaken += attemptsRes.data.length;
                  
                  attemptsRes.data.forEach(attempt => {
                    if (attempt.score !== undefined) {
                      totalScores += attempt.score;
                      scoreCount++;
                    }
                  });
                }
              } catch (err) {
                console.log('Skipping assessment attempt:', err.message);
              }
            }
          }
        } catch (err) {
          console.log(`Skipping assessments for course ${course.id}:`, err.message);
        }
      }

      setStats({
        totalCourses: courseList.length,
        lessonsCompleted: totalLessonsCompleted,
        assessmentsTaken: totalAssessmentsTaken,
        averageScore: scoreCount > 0 ? Math.round(totalScores / scoreCount) : 0,
      });
    } catch (err) {
      console.error('Stats loading error:', err);
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: '#6b7280', marginTop: 12 }}>Loading dashboard...</Text>
          <TouchableOpacity
            onPress={handleLogout}
            style={{ marginTop: 24, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#dc2626', borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {error && (
        <View style={{ margin: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' }}>
          <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
          <TouchableOpacity onPress={loadDashboardData} style={{ marginTop: 8 }}>
            <Text style={{ color: '#3b82f6', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Greeting Card */}
      <Card style={styles.greetingCard}>
        <Card.Content style={styles.greetingContent}>
          <View style={styles.greetingTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileButton}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={40}
                color="#3b82f6"
              />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="book"
              size={24}
              color="#3b82f6"
            />
            <Text style={styles.statNumber}>{stats.totalCourses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color="#10b981"
            />
            <Text style={styles.statNumber}>{stats.lessonsCompleted}</Text>
            <Text style={styles.statLabel}>Lessons</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="file-document"
              size={24}
              color="#f97316"
            />
            <Text style={styles.statNumber}>{stats.assessmentsTaken}</Text>
            <Text style={styles.statLabel}>Assessments</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="star"
              size={24}
              color="#8b5cf6"
            />
            <Text style={styles.statNumber}>{stats.averageScore}%</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Continue Learning Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Courses</Text>
          <TouchableOpacity onPress={() => navigation.navigate('StudentCourses')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {courses.length > 0 ? (
          <View style={styles.coursesList}>
            {courses.slice(0, 3).map((course) => (
              <TouchableOpacity
                key={course.id}
                style={[styles.courseCard, { borderLeftColor: course.color }]}
                onPress={() =>
                  navigation.navigate('CourseDetails', { courseId: course.id })
                }
              >
                <Text style={styles.courseName} numberOfLines={1}>
                  {course.name}
                </Text>
                <Text style={styles.courseTeacher} numberOfLines={1}>
                  {course.teacher}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${course.progress}%`,
                        backgroundColor: course.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{course.progress}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="book-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No courses yet</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('StudentCourses')}
          >
            <MaterialCommunityIcons
              name="book-multiple"
              size={32}
              color="#3b82f6"
            />
            <Text style={styles.actionLabel}>Courses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('StudentCourses')}
          >
            <MaterialCommunityIcons
              name="file-document-multiple"
              size={32}
              color="#dc2626"
            />
            <Text style={styles.actionLabel}>Assessments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Profile')}
          >
            <MaterialCommunityIcons
              name="account"
              size={32}
              color="#8b5cf6"
            />
            <Text style={styles.actionLabel}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialCommunityIcons
              name="bell"
              size={32}
              color="#f97316"
            />
            <Text style={styles.actionLabel}>Notifications</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  greetingCard: {
    margin: 16,
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 1,
  },
  greetingContent: {
    paddingVertical: 20,
  },
  greetingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#fff',
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  coursesList: {
    gap: 12,
  },
  courseCard: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
  },
  courseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  courseTeacher: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default StudentDashboardScreen;
