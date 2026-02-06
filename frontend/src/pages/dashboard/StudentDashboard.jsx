import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import studentService from '@/services/studentService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const StudentDashboard = () => {
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [lessonsRes, assessmentsRes] = await Promise.all([
        studentService.getLessons(),
        studentService.getAssessments()
      ]);
      setLessons(lessonsRes.data || []);
      setAssessments(assessmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lessons.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{assessments.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">N/A</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">Your Lessons</h2>
      {loading ? (
        <p>Loading lessons...</p>
      ) : lessons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardHeader>
                <CardTitle>{lesson.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{lesson.description}</p>
                <div className="flex justify-between items-center text-xs">
                  <span>Type: {lesson.contentType}</span>
                  <button className="text-primary hover:underline">View Lesson</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No lessons available at this time.
          </CardContent>
        </Card>
      )}

      <h2 className="text-xl font-semibold mt-8 mb-4">Your Assessments</h2>
      {loading ? (
        <p>Loading assessments...</p>
      ) : assessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
          {assessments.map((assessment) => (
            <Card key={assessment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{assessment.title}</CardTitle>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded uppercase">
                    {assessment.type}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{assessment.description}</p>
                <div className="flex justify-between items-center text-xs">
                  <span>Due: {new Date(assessment.dueDate).toLocaleDateString()}</span>
                  <button className="text-primary font-bold hover:underline">Start Assessment</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="pb-8">
          <CardContent className="py-8 text-center text-muted-foreground">
            No assessments assigned at this time.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;
