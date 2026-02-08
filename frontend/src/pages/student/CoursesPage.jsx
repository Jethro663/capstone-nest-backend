import { useState, useEffect } from "react";
import { GraduationCap, Clock, Users, AlertCircle } from "lucide-react";
import lessonService from '@/services/lessonService';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import StudentClassDetailsPage from './StudentClassDetailsPage';

export default function CoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [lessonErrors, setLessonErrors] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [completions, setCompletions] = useState({});

  // Fetch real enrolled courses for this student
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user || !user.id) return;
      setLoading(true);
      try {
        const res = await api.get(`/classes/student/${user.id}`);
        if (res?.data?.data && Array.isArray(res.data.data)) {
          const courseList = res.data.data.map(c => ({
            id: c.id,
            name: c.subjectName ? `${c.subjectName} (${(c.subjectCode||'').toUpperCase()})` : (c.name || 'Unknown'),
            grade: c.subjectGradeLevel ? `Grade ${c.subjectGradeLevel}` : (c.section?.gradeLevel ? `Grade ${c.section.gradeLevel}` : 'Grade —'),
            teacher: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'Unknown',
            schedule: c.schedule || '—',
            students: Array.isArray(c.enrollments) ? c.enrollments.length : 0,
            progress: 0, // Will be calculated after lessons load
            color: pickColor(c.subjectCode || c.id),
            lessons: [],
          }));
          if (mounted) setCourses(courseList);
        }
      } catch (err) {
        console.error('Failed to load student courses', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  // Fetch lessons for all courses
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (courses.length === 0) return;
      setLoadingLessons(true);
      const next = await Promise.all(courses.map(async (c) => {
        try {
          const res = await lessonService.getLessonsByClass(c.id);
          if (res && res.data) {
            return { ...c, lessons: res.data };
          }
          return c;
        } catch (err) {
          console.error(`Failed to load lessons for class ${c.id}`, err);
          setLessonErrors(prev => ({ ...prev, [c.id]: true }));
          return c;
        }
      }));

      if (mounted) setCourses(next);
      setLoadingLessons(false);
    };

    load();
    return () => { mounted = false; };
  }, [courses.length]);

  // Fetch lesson completions for all courses and calculate progress
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (courses.length === 0 || !loadingLessons === false) return;
      // Only proceed if all courses have lessons loaded
      if (!courses.every(c => Array.isArray(c.lessons))) return;
      
      const newCompletions = {};
      const updatedCourses = await Promise.all(courses.map(async (c) => {
        try {
          const res = await lessonService.getCompletedLessonsForClass(c.id);
          if (res && res.data) {
            const completed = res.data.length;
            const total = c.lessons.length || 0;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            newCompletions[c.id] = {
              completed,
              total,
              progress,
            };
            
            return { ...c, progress };
          }
          return c;
        } catch (err) {
          console.error(`Failed to load completions for class ${c.id}`, err);
          return c;
        }
      }));

      if (mounted) {
        setCompletions(newCompletions);
        setCourses(updatedCourses);
      }
    };

    load();
    return () => { mounted = false; };
  }, [courses.length, loadingLessons]);

  // Deterministically pick a color for course cards
  const COLORS = ["#3B82F6","#8B5CF6","#10B981","#F97316","#EC4899","#14B8A6","#64748B"];
  const pickColor = (seed) => {
    if (!seed) return COLORS[0];
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h << 5) - h + seed.charCodeAt(i);
      h |= 0;
    }
    return COLORS[Math.abs(h) % COLORS.length];
  };

  // General container styles
  const containerStyle = {
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
    padding: "32px",
    fontFamily: "Arial, sans-serif"
  };

  const headerStyle = {
    marginBottom: "24px",
  };

  const titleStyle = { fontSize: "24px", margin: 0, color: "#111" };
  const subtitleStyle = { fontSize: "14px", color: "#555" };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px"
  };

  const cardStyle = {
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #ddd",
    overflow: "hidden",
    transition: "box-shadow 0.2s, transform 0.2s",
    cursor: "pointer"
  };

  const cardHeaderStyle = color => ({
    height: "6px",
    backgroundColor: color
  });

  const cardContentStyle = { padding: "16px" };
  const cardTitleStyle = { fontSize: "18px", margin: "0 0 4px 0", color: "#111" };
  const cardSubtitleStyle = { fontSize: "12px", color: "#555", marginBottom: "12px" };
  const cardRowStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#555", marginBottom: "8px" };

  const emptyStyle = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "64px",
    textAlign: "center"
  };
  const iconCircleStyle = {
    width: "64px",
    height: "64px",
    background: "#eee",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px auto"
  };

  return selectedCourse ? (
    <StudentClassDetailsPage 
      classItem={selectedCourse}
      onBack={() => setSelectedCourse(null)}
    />
  ) : (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>My Courses</h1>
        <p style={subtitleStyle}>Access your enrolled subjects and learning materials.</p>
      </div>

      {/* Empty State */}
      {!loading && courses.length === 0 ? (
        <div style={emptyStyle}>
          <div style={iconCircleStyle}><GraduationCap /></div>
          <h2>Not enrolled in any courses</h2>
          <p>You are not currently enrolled in any classes. Please contact the registrar or administrator.</p>
        </div>
      ) : loading ? (
        <div style={emptyStyle}>
          <p>Loading your courses...</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {courses.map(course => (
            <div
              key={course.id}
              style={cardStyle}
              onClick={() => setSelectedCourse(course)}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {/* Color Header */}
              <div style={cardHeaderStyle(course.color)}></div>

              {/* Card Content */}
              <div style={cardContentStyle}>
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={cardTitleStyle}>{course.name}</h3>
                  <p style={cardSubtitleStyle}>{course.grade}</p>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={cardRowStyle}>
                    <Users style={{ width: "14px", height: "14px", color: "#555" }} />
                    <span>{course.students} students</span>
                  </div>
                  <div style={cardRowStyle}>
                    <Clock style={{ width: "14px", height: "14px", color: "#555" }} />
                    <span>{course.schedule}</span>
                  </div>
                </div>

                {/* Lessons preview */}
                {loadingLessons && (!course.lessons || course.lessons.length === 0) ? (
                  <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>Loading lessons...</div>
                ) : lessonErrors[course.id] ? (
                  <div style={{ marginTop: 8, color: '#dc2626', fontSize: 12 }}>Failed to load lessons</div>
                ) : (course.lessons && course.lessons.length > 0) ? (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "8px" }}>
                      {course.lessons.length} lesson{course.lessons.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>No lessons yet</div>
                )}

                {/* Progress Bar and Completion Status */}
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "#555",
                    marginBottom: "6px"
                  }}>
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div style={{
                    height: "6px",
                    background: "#e5e7eb",
                    borderRadius: "3px",
                    overflow: "hidden",
                    width: "100%"
                  }}>
                    <div style={{
                      height: "100%",
                      borderRadius: "3px",
                      transition: "width 0.3s",
                      width: `${course.progress}%`,
                      backgroundColor: course.color
                    }} />
                  </div>
                  {completions[course.id] && (
                    <div style={{
                      marginTop: "6px",
                      fontSize: "11px",
                      color: "#6b7280"
                    }}>
                      {completions[course.id].completed} of {completions[course.id].total} lessons completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
