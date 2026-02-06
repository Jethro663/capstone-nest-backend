import React from 'react';
import { Users, Clock, BookOpen, MoreVertical } from "lucide-react";

export function ClassesPage() {
  const classes = [
    { id: 1, name: "Mathematics 101", grade: "Grade 7", students: 28, schedule: "Mon, Wed, Fri - 9:00 AM", color: "#3B82F6" },
    { id: 2, name: "Advanced Calculus", grade: "Grade 10", students: 22, schedule: "Tue, Thu - 10:30 AM", color: "#8B5CF6" },
    { id: 3, name: "Geometry", grade: "Grade 9", students: 30, schedule: "Mon, Wed, Fri - 2:00 PM", color: "#10B981" },
    { id: 4, name: "Algebra II", grade: "Grade 8", students: 25, schedule: "Tue, Thu - 1:00 PM", color: "#F97316" },
    { id: 5, name: "Statistics", grade: "Grade 7", students: 24, schedule: "Mon, Wed - 11:00 AM", color: "#EC4899" },
    { id: 6, name: "Pre-Calculus", grade: "Grade 10", students: 27, schedule: "Tue, Thu - 3:30 PM", color: "#14B8A6" },
  ];

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
  const cardRowStyle = { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#555", marginBottom: "6px" };

  const detailsButtonStyle = {
    flex: 1,
    padding: "8px 0",
    borderRadius: "6px",
    fontSize: "12px",
    border: "1px solid #E74C3C",
    color: "#E74C3C",
    backgroundColor: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    cursor: "pointer",
    transition: "all 0.2s"
  };

  const detailsButtonHoverStyle = {
    backgroundColor: "#E74C3C",
    color: "#fff"
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>My Classes</h1>
        <p style={subtitleStyle}>Manage your assigned classes and student rosters.</p>
      </div>

      {/* Classes Grid */}
      <div style={gridStyle}>
        {classes.map(classItem => (
          <div
            key={classItem.id}
            style={cardStyle}
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
            <div style={cardHeaderStyle(classItem.color)}></div>

            {/* Card Content */}
            <div style={cardContentStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h3 style={cardTitleStyle}>{classItem.name}</h3>
                  <p style={cardSubtitleStyle}>{classItem.grade}</p>
                </div>
                <MoreVertical style={{ width: "16px", height: "16px", color: "#888", cursor: "pointer" }} />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div style={cardRowStyle}>
                  <Users style={{ width: "14px", height: "14px", color: "#555" }} />
                  <span>{classItem.students} students</span>
                </div>
                <div style={cardRowStyle}>
                  <Clock style={{ width: "14px", height: "14px", color: "#555" }} />
                  <span>{classItem.schedule}</span>
                </div>
              </div>

              {/* View Details Button */}
<button
  style={{
    ...detailsButtonStyle,
    width: "100%",       // full width
    padding: "12px 0",   // taller button
    justifyContent: "center" // center text and icon
  }}
  onMouseEnter={e => Object.assign(e.target.style, detailsButtonHoverStyle)}
  onMouseLeave={e => Object.assign(e.target.style, detailsButtonStyle)}
>
  <BookOpen style={{ width: "16px", height: "16px" }} />
  View Details
</button>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClassesPage;
