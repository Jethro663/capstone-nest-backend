import { useState } from "react";
import { GraduationCap, Clock, Users } from "lucide-react";

export default function CoursesPage() {
  const [courses] = useState([
    { id: "1", name: "Mathematics", code: "MATH 101", teacher: "Ms. Johnson", schedule: "Mon, Wed, Fri - 8:00 AM", room: "Room 204", students: 28, progress: 75, color: "#3B82F6" },
    { id: "2", name: "English Literature", code: "ENG 201", teacher: "Mr. Smith", schedule: "Tue, Thu - 10:00 AM", room: "Room 105", students: 25, progress: 60, color: "#8B5CF6" },
    { id: "3", name: "Science", code: "SCI 301", teacher: "Mrs. Davis", schedule: "Mon, Wed - 1:00 PM", room: "Lab 3", students: 30, progress: 45, color: "#10B981" },
    { id: "4", name: "History", code: "HIST 102", teacher: "Mr. Brown", schedule: "Tue, Thu - 2:00 PM", room: "Room 301", students: 26, progress: 85, color: "#F97316" },
    { id: "5", name: "Physical Education", code: "PE 101", teacher: "Coach Wilson", schedule: "Fri - 3:00 PM", room: "Gymnasium", students: 32, progress: 90, color: "#EF4444" },
    { id: "6", name: "Computer Science", code: "CS 201", teacher: "Dr. Anderson", schedule: "Mon, Wed - 11:00 AM", room: "Computer Lab", students: 24, progress: 55, color: "#4F46E5" },
  ]);

  // General container styles
  const containerStyle = {
    padding: "32px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f9f9f9"
  };

  const headerStyle = { marginBottom: "32px" };
  const titleStyle = { fontSize: "28px", margin: 0, color: "#111" };
  const subtitleStyle = { color: "#555", marginTop: "4px" };

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

  const coursesGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px"
  };

  const courseCardStyle = {
    background: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid #ddd",
    display: "flex",
    flexDirection: "column",
    cursor: "pointer",
    transition: "box-shadow 0.2s",
  };

  const courseHeaderStyle = color => ({
    padding: "24px",
    color: "#fff",
    backgroundColor: color
  });

  const courseCodeStyle = { opacity: 0.85, fontSize: "12px", marginBottom: "8px" };
  const courseNameStyle = { fontSize: "20px", margin: "0 0 8px 0" };
  const courseStudentsStyle = { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" };

  const courseDetailsStyle = { padding: "16px 24px", flex: 1, display: "flex", flexDirection: "column" };
  const detailRowStyle = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" };
  const iconStyle = { width: "16px", height: "16px", color: "#888", flexShrink: 0 };
  const labelStyle = { fontSize: "12px", color: "#555" };
  const valueStyle = { fontSize: "14px", fontWeight: "bold", color: "#222" };

  const buttonStyle = {
    marginTop: "16px",
    padding: "8px 0",
    background: "#f0f0f0",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "#333",
    transition: "background 0.2s"
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>My Courses</h1>
        <p style={subtitleStyle}>Access your enrolled subjects and learning materials.</p>
      </div>

      {/* Empty State */}
      {courses.length === 0 ? (
        <div style={emptyStyle}>
          <div style={iconCircleStyle}><GraduationCap /></div>
          <h2>Not enrolled in any courses</h2>
          <p>You are not currently enrolled in any classes. Please contact the registrar or administrator.</p>
        </div>
      ) : (
        <div style={coursesGridStyle}>
          {courses.map(course => (
            <div key={course.id} style={courseCardStyle}>
              {/* Course Header */}
              <div style={courseHeaderStyle(course.color)}>
                <div style={courseCodeStyle}>{course.code}</div>
                <h3 style={courseNameStyle}>{course.name}</h3>
                <div style={courseStudentsStyle}>
                  <Users style={iconStyle} />
                  <span>{course.students} students</span>
                </div>
              </div>

              {/* Course Details */}
              <div style={courseDetailsStyle}>
                <div style={detailRowStyle}>
                  <GraduationCap style={iconStyle} />
                  <div>
                    <div style={labelStyle}>Teacher</div>
                    <div style={valueStyle}>{course.teacher}</div>
                  </div>
                </div>

                <div style={detailRowStyle}>
                  <Clock style={iconStyle} />
                  <div>
                    <div style={labelStyle}>Schedule</div>
                    <div style={valueStyle}>{course.schedule}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginTop: "12px" }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "#555",
                    marginBottom: "4px"
                  }}>
                    <span>Course Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div style={{
                    height: "8px",
                    background: "#eee",
                    borderRadius: "4px",
                    overflow: "hidden",
                    width: "100%"
                  }}>
                    <div style={{
                      height: "100%",
                      borderRadius: "4px",
                      transition: "width 0.3s",
                      width: `${course.progress}%`,
                      backgroundColor: course.color
                    }} />
                  </div>
                </div>

                <button style={buttonStyle}>View Course</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
