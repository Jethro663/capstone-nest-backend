import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import studentService from '@/services/studentService';
import lessonService from '@/services/lessonService';
import assessmentService from '@/services/assessmentService';
import profilesService from '@/services/profilesService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Bell } from 'lucide-react';

// ============================================================================
// HELPER: Check if profile is incomplete (for students only)
// ============================================================================
function isProfileIncomplete(user, profile) {
  // Only students need profile completion — admins/teachers skip
  if (!user || user.roles?.includes('admin') || user.roles?.includes('teacher')) {
    return false;
  }

  const hasValue = (v) =>
    v !== undefined && v !== null && !(typeof v === 'string' && !v.trim());

  // User-level required fields
  if (!hasValue(user.firstName) || !hasValue(user.lastName)) return true;

  // Profile-level required fields
  const fields = ['dateOfBirth', 'gender', 'phone', 'address', 'familyName', 'familyRelationship', 'familyContact'];
  for (const f of fields) {
    const v = f === 'dateOfBirth'
      ? (profile?.dateOfBirth ?? profile?.dob ?? user.dateOfBirth ?? user.dob)
      : (profile?.[f] ?? user[f]);
    if (!hasValue(v)) return true;
  }
  return false;
}

// ============================================================================
// HELPER: Safely get description string (handles objects/nulls)
// ============================================================================
function getDescription(desc) {
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  if (typeof desc === 'object' && desc.description) return desc.description;
  return '';
}

// ============================================================================
// HELPER: Safely get teacher/instructor name (handles objects/strings)
// ============================================================================
function getTeacherName(teacher) {
  if (!teacher) return 'Instructor';
  if (typeof teacher === 'string') return teacher;
  if (typeof teacher === 'object' && (teacher.firstName || teacher.lastName)) {
    return `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'Instructor';
  }
  return 'Instructor';
}

const StudentDashboard = ({ onNavigateToComplete }) => {
  const [classes, setClasses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const profileIncomplete = isProfileIncomplete(user, profile);
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Student';

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch user profile
      let profileData = null;
      try {
        const profileRes = await profilesService.getMyProfile();
        console.log('Profile response:', profileRes);
        profileData = profileRes?.data || profileRes || null;
        setProfile(profileData);
      } catch (err) {
        console.warn('Failed to load profile:', err);
      }

      // Fetch enrolled classes
      const classesRes = await studentService.getEnrolledClasses(user.id);
      const classList = classesRes?.data || classesRes || [];
      setClasses(classList.slice(0, 5)); // Show up to 5 recent classes

      // Fetch lessons and assessments from enrolled classes
      if (classList.length > 0) {
        const lessonPromises = classList.slice(0, 3).map(cls => 
          lessonService.getLessonsByClass(cls.id).catch(() => null)
        );
        const assessmentPromises = classList.slice(0, 3).map(cls =>
          assessmentService.getAssessmentsByClass(cls.id).catch(() => null)
        );

        const [lessonResults, assessmentResults] = await Promise.all([
          Promise.all(lessonPromises),
          Promise.all(assessmentPromises)
        ]);

        const allLessons = lessonResults
          .filter(Boolean)
          .flatMap(res => res?.data || res || [])
          .slice(0, 6); // Show up to 6 recent lessons

        const allAssessments = assessmentResults
          .filter(Boolean)
          .flatMap(res => res?.data || res || [])
          .slice(0, 6); // Show up to 6 recent assessments

        setLessons(allLessons);
        setAssessments(allAssessments);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-3/4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Welcome Section - Enhanced & More Visible */}
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-xl border border-blue-400">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-1">Welcome back, {fullName}!</h1>
            <p className="text-blue-100 text-sm">
              {user?.studentId ? `Student ID: ${user.studentId}` : 'Complete your profile to get started'}
            </p>
          </div>
          <div className="text-3xl">🎓</div>
        </div>
      </div>

      {/* Profile Completion Status Board - Compact */}
      {profileIncomplete ? (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-base text-red-700">Profile Incomplete</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-red-600 mb-3">
              Complete your profile to unlock all features and personalized content.
            </p>
            {onNavigateToComplete && (
              <button
                onClick={onNavigateToComplete}
                className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors font-medium"
              >
                Complete Now
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-l-4 border-l-green-500 bg-green-50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <CardTitle className="text-base text-green-700">Profile Complete ✓</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-green-600">
              Great! Your profile is complete. Ready to start learning?
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Section - More Compact */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-blue-50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-blue-700">Classes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold text-blue-600">{classes.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-purple-700">Lessons</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold text-purple-600">{lessons.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-orange-700">Assessments</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold text-orange-600">{assessments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Announcement Board - Compact */}
      <Card className="border-l-4 border-l-amber-500 bg-amber-50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600" />
            <CardTitle className="text-sm">Announcements</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-gray-600">
            📢 No announcements at this time. Check back soon for updates!
          </p>
        </CardContent>
      </Card>

      {/* Recent Classes - Compact */}
      {classes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Your Classes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {classes.slice(0, 6).map((classItem) => (
              <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{classItem.className || classItem.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-gray-600 mb-2">{getTeacherName(classItem.teacher)}</p>
                  <button className="text-blue-600 hover:text-blue-700 font-medium text-xs hover:underline">
                    View →
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Lessons - Compact */}
      {lessons.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Recent Lessons</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lessons.slice(0, 4).map((lesson) => (
              <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{lesson.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{getDescription(lesson.description)}</p>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      {lesson.contentType || 'Lesson'}
                    </span>
                    <button className="text-blue-600 hover:text-blue-700 font-medium text-xs hover:underline">
                      Open →
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Assessments - Compact */}
      {assessments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Pending Assessments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-4">
            {assessments.slice(0, 4).map((assessment) => (
              <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-sm flex-1">{assessment.title}</CardTitle>
                    <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                      {assessment.type || 'Quiz'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-gray-600 mb-2 line-clamp-1">{getDescription(assessment.description)}</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">
                      Due: {new Date(assessment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <button className="text-blue-600 hover:text-blue-700 font-bold hover:underline">
                      Start
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty States */}
      {classes.length === 0 && lessons.length === 0 && assessments.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <p className="text-sm">You're all caught up! No new classes or activities at this time.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;
