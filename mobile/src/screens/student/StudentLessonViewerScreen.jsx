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
import { lessonService } from '../../services/index';

const StudentLessonViewerScreen = ({ route, navigation }) => {
  const { lesson, courseId, allLessons = [] } = route.params;
  const [contentBlocks, setContentBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (lesson?.id) {
      fetchLessonContent();
      fetchCompletionStatus();
    }
  }, [lesson?.id]);

  const fetchLessonContent = async () => {
    setLoading(true);
    try {
      const res = await lessonService.getLessonById(lesson.id);
      if (res?.data) {
        const blocks = Array.isArray(res.data) ? res.data : (res.data.contentBlocks || []);
        setContentBlocks(blocks);
      }
    } catch (err) {
      console.error('Failed to load lesson content', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletionStatus = async () => {
    try {
      const res = await lessonService.checkLessonCompletion(lesson.id);
      if (res?.data) {
        setIsCompleted(res.data.isCompleted);
      }
    } catch (err) {
      console.error('Failed to load completion status', err);
    }
  };

  const handleMarkComplete = async () => {
    try {
      await lessonService.markLessonComplete(lesson.id);
      setIsCompleted(true);
    } catch (err) {
      console.error('Failed to mark lesson complete', err);
    }
  };

  const currentLessonIndex = allLessons.findIndex(l => l.id === lesson.id);
  const previousLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  const handleNavigateLesson = (targetLesson) => {
    navigation.push('StudentLessonViewer', {
      lesson: targetLesson,
      courseId,
      allLessons,
    });
  };

  const renderContentBlock = (block) => {
    const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);

    switch (block.type) {
      case 'text':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <Text style={styles.blockText}>{content}</Text>
          </View>
        );

      case 'heading':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <Text style={styles.blockHeading}>{content}</Text>
          </View>
        );

      case 'image':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <MaterialCommunityIcons name="image" size={60} color="#d1d5db" />
            <Text style={styles.blockCaption}>{content || 'Image content'}</Text>
          </View>
        );

      case 'video':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <View style={styles.videoContainer}>
              <MaterialCommunityIcons name="play-circle" size={60} color="#dc2626" />
            </View>
            <Text style={styles.blockCaption}>{content || 'Video content'}</Text>
          </View>
        );

      case 'code':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>{content}</Text>
            </View>
          </View>
        );

      case 'quote':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <View style={styles.quoteBlock}>
              <MaterialCommunityIcons name="quote-left" size={20} color="#9ca3af" />
              <Text style={styles.quoteText}>{content}</Text>
            </View>
          </View>
        );

      default:
        return (
          <View key={block.id} style={styles.contentBlock}>
            <Text style={styles.blockText}>{content}</Text>
          </View>
        );
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{lesson.title || lesson.name}</Text>
        </View>
        {isCompleted && (
          <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
        )}
      </View>

      <View style={[styles.progressBar, { width: `${scrollProgress}%` }]} />

      <ScrollView 
        style={styles.content}
        onScroll={(e) => {
          const scrollHeight = e.nativeEvent.contentSize.height - e.nativeEvent.layoutMeasurement.height;
          const progress = scrollHeight > 0 ? (e.nativeEvent.contentOffset.y / scrollHeight) * 100 : 0;
          setScrollProgress(Math.min(progress, 100));
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.lessonContent}>
          {contentBlocks.length > 0 ? (
            contentBlocks.map(block => renderContentBlock(block))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No content available</Text>
            </View>
          )}

          <View style={styles.navigationSection}>
            {previousLesson && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => handleNavigateLesson(previousLesson)}
              >
                <MaterialCommunityIcons name="chevron-left" size={20} color="#3b82f6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.navLabel}>Previous</Text>
                  <Text style={styles.navLessonName} numberOfLines={1}>
                    {previousLesson.title || previousLesson.name}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {nextLesson && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => handleNavigateLesson(nextLesson)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.navLabel}>Next</Text>
                  <Text style={styles.navLessonName} numberOfLines={1}>
                    {nextLesson.title || nextLesson.name}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#3b82f6" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.completeButton, isCompleted && styles.completedButton]}
          onPress={handleMarkComplete}
          disabled={isCompleted}
        >
          <MaterialCommunityIcons
            name={isCompleted ? 'check-circle' : 'check'}
            size={20}
            color={isCompleted ? '#10b981' : '#fff'}
          />
          <Text style={[styles.buttonText, isCompleted && styles.completedButtonText]}>
            {isCompleted ? 'Completed' : 'Mark as Complete'}
          </Text>
        </TouchableOpacity>
      </View>
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
    color: '#111827',
  },
  progressBar: {
    height: 2,
    backgroundColor: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  lessonContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  contentBlock: {
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  blockText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  blockHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  blockCaption: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  videoContainer: {
    height: 200,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBlock: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#e5e7eb',
    lineHeight: 18,
  },
  quoteBlock: {
    paddingLeft: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    paddingVertical: 8,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6b7280',
    marginTop: 4,
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
  navigationSection: {
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  navLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  navLessonName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  completedButton: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  completedButtonText: {
    color: '#10b981',
  },
});

export default StudentLessonViewerScreen;
