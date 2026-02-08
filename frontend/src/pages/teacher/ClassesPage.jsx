import React, { useState, useEffect, useCallback } from 'react';
import { Users, Clock, BookOpen, MoreVertical } from "lucide-react";
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export function ClassesPage({ onViewClassDetails }) {
  // Keep the same mock format initially, but load from API for the current teacher
  const { user } = useAuth();
  const [classes, setClasses] = useState([
   
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);

  // deterministically pick a color for class cards
  const COLORS = ["#3B82F6","#8B5CF6","#10B981","#F97316","#EC4899","#14B8A6","#64748B"];
  const pickColor = (seed) => {
    if (!seed) return COLORS[0];
    let h = 0; for (let i = 0; i < seed.length; i++) { h = (h << 5) - h + seed.charCodeAt(i); h |= 0; }
    return COLORS[Math.abs(h) % COLORS.length];
  };

  const mapClassToCard = (c) => ({
    id: c.id,
    name: c.subjectName ? `${c.subjectName} (${(c.subjectCode||'').toUpperCase()})` : (c.subject || 'Unknown'),
    grade: c.subjectGradeLevel ? `Grade ${c.subjectGradeLevel}` : (c.section?.gradeLevel ? `Grade ${c.section.gradeLevel}` : 'Grade —'),
    students: (Array.isArray(c.enrollments) ? c.enrollments.length : 0) || (c.studentCount || 0),
    schedule: c.schedule || '—',
    color: pickColor(c.subjectCode || c.id?.toString() || c.subjectName || c.name),
  });

  const fetchClasses = useCallback(async () => {
    if (!user || !user.userId) return;
    setLoading(true);
    try {
      const res = await api.get(`/classes/teacher/${user.userId}`);
      console.log('API response for teacher classes:', res);
      if (res.data?.data) {
        const items = res.data.data.map(mapClassToCard);
        setClasses(items);
      }
    } catch (err) {
      console.error('Failed to load teacher classes', err);
      // keep mock data as a fallback
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

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
            onClick={() => onViewClassDetails?.(classItem)}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.cursor = "pointer";
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClassesPage;
