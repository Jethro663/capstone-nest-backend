import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import teacherService from '@/services/teacherService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import CreateLessonModal from '@/components/modals/CreateLessonModal';
import CreateAssessmentModal from '@/components/modals/CreateAssessmentModal';

const TeacherDashboard = () => {
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const [lessonsRes, classesRes, assessmentsRes] = await Promise.all([
        teacherService.getLessons(),
        teacherService.getClasses(),
        teacherService.getAssessments()
      ]);
      setLessons(lessonsRes.data || []);
      setClasses(classesRes.data || []);
      setAssessments(assessmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await teacherService.deleteLesson(id);
      toast.success('Lesson deleted successfully');
      fetchTeacherData();
    } catch (error) {
      toast.error('Failed to delete lesson');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          Create New Lesson
        </Button>
        <Button onClick={() => setIsAssessmentModalOpen(true)} variant="outline">
          Create New Assessment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">My Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lessons.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">My Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{classes.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{assessments.length}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">Manage Your Lessons</h2>
      {loading ? (
        <p>Loading lessons...</p>
      ) : lessons.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground font-medium border-b">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lessons.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{lesson.title}</td>
                  <td className="px-4 py-3 uppercase text-xs">{lesson.contentType}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button 
                      className="text-primary hover:underline"
                      onClick={() => toast.info('Edit feature - Backend ready placeholder')}
                    >
                      Edit
                    </button>
                    <button 
                      className="text-destructive hover:underline"
                      onClick={() => handleDeleteLesson(lesson.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You haven't created any lessons yet.
          </CardContent>
        </Card>
      )}

      <h2 className="text-xl font-semibold mt-8 mb-4">Manage Your Assessments</h2>
      {loading ? (
        <p>Loading assessments...</p>
      ) : assessments.length > 0 ? (
        <div className="border rounded-lg overflow-hidden mb-8">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground font-medium border-b">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assessments.map((assessment) => (
                <tr key={assessment.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{assessment.title}</td>
                  <td className="px-4 py-3 uppercase text-xs">{assessment.type}</td>
                  <td className="px-4 py-3 text-xs">{new Date(assessment.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button className="text-primary hover:underline">Edit</button>
                    <button className="text-destructive hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent className="py-8 text-center text-muted-foreground">
            You haven't created any assessments yet.
          </CardContent>
        </Card>
      )}

      <CreateLessonModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        classes={classes}
        onLessonCreated={fetchTeacherData}
      />

      <CreateAssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        classes={classes}
        onAssessmentCreated={fetchTeacherData}
      />
    </div>
  );
};

export default TeacherDashboard;
