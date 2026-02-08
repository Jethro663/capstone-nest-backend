import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Edit2, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/services/api";
import CreateClassModal from "@/components/modals/CreateClassModal";
import DeleteModal from "@/components/modals/DeleteModal";

const ClassManagementPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------
  // Fetch Classes
  // -------------------------
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/classes/all");
      if (response.data.success) {
        const transformedClasses = response.data.data.map((c) => ({
          _id: c.id,
          // denormalized subject fields (preferred)
          subjectName: c.subjectName || c.subject?.name || "Unknown",
          subjectCode: (c.subjectCode || c.subject?.code || "").toUpperCase(),
          subject: c.subjectName || c.subject?.name ? `${c.subjectName || c.subject?.name} (${(c.subjectCode || c.subject?.code || "").toUpperCase()})` : "Unknown",
          section: c.section?.name || "Unknown",
          sectionId: c.section?.id || null,
          teacher: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : "Unknown",
          teacherId: c.teacher?.id || null,
          gradeLevel: c.subjectGradeLevel || c.section?.gradeLevel || "—",
          schoolYear: c.schoolYear,
          schedule: c.schedule || "—",
          room: c.room || "—",
          isActive: c.isActive,
        }));
        setClasses(transformedClasses);
      }
    } catch (error) {
      console.error("Failed to load classes", error);
      toast.error("Failed to load classes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // -------------------------
  // Add or Update Class
  // -------------------------
  const handleAddOrUpdateClass = async (classData) => {
    try {
      if (editingClass) {
        const response = await api.put(`/classes/${editingClass._id}`, classData);
        if (response.data.success) toast.success("Class updated successfully");
      } else {
        const response = await api.post("/classes", classData);
        if (response.data.success) toast.success("Class created successfully");
      }
      await fetchClasses();
      setIsModalOpen(false);
      setEditingClass(null);
    } catch (error) {
      console.error("Failed to save class", error);
      toast.error(error.response?.data?.message || "Failed to save class");
    }
  };

  // -------------------------
  // Delete Class
  // -------------------------
  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/classes/${classToDelete._id}`);
      toast.success("Class deleted successfully");
      setClasses(prev => prev.filter(c => c._id !== classToDelete._id));
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete class");
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setClassToDelete(null);
    }
  };

  const confirmDeleteClass = (cls) => {
    setClassToDelete(cls);
    setIsDeleteModalOpen(true);
  };

  // -------------------------
  // Filter & Search
  // -------------------------
  const filteredClasses = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return classes.filter(c => {
      const matchesGrade = selectedGrade === "all" ? true : c.gradeLevel === selectedGrade;
      const matchesSearch =
        c.subject.toLowerCase().includes(term) ||
        c.section.toLowerCase().includes(term) ||
        c.teacher.toLowerCase().includes(term) ||
        c.schedule.toLowerCase().includes(term) ||
        c.room.toLowerCase().includes(term) ||
        c.gradeLevel.toLowerCase().includes(term);
      return matchesGrade && matchesSearch;
    });
  }, [classes, searchTerm, selectedGrade]);

  // -------------------------
  // Inline Styles
  // -------------------------
  const containerStyle = { width: "100%", minHeight: "100vh", padding: "40px 20px", background: "#f2f2f2", display: "flex", justifyContent: "center" };
  const cardStyle = { width: "100%", maxWidth: "1200px", background: "#fff", borderRadius: "12px", padding: "30px", boxShadow: "0 10px 20px rgba(0,0,0,0.05)" };
  const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: "25px" };
  const titleStyle = { fontSize: "28px", fontWeight: "bold", margin: 0 };
  const subtitleStyle = { fontSize: "14px", color: "#555", marginTop: "5px" };
  const buttonStyle = { padding: "10px 18px", display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
  const filterBtnStyle = (active) => ({
    padding: "8px 16px",
    borderRadius: "999px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: active ? "#111827" : "#f5f5f5",
    color: active ? "#fff" : "#4b5563",
    boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
    transition: "all 0.2s"
  });
  const searchContainerStyle = { display: "flex", alignItems: "center", gap: "8px", background: "#f5f5f5", padding: "8px 12px", borderRadius: "12px", border: "1px solid #ddd", maxWidth: "400px" };
  const tableContainerStyle = { overflowX: "auto", borderRadius: "12px", border: "1px solid #ddd", background: "#fff" };
  const tableStyle = { width: "100%", borderCollapse: "collapse" };
  const thStyle = { textAlign: "left", padding: "12px 16px", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", color: "#4b5563", borderBottom: "1px solid #ddd" };
  const tdStyle = { padding: "12px 16px", fontSize: "14px", color: "#111827" };
  const statusBadgeStyle = (active) => ({
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: active ? "#d1fae5" : "#fee2e2",
    color: active ? "#059669" : "#dc2626",
    display: "inline-block"
  });
  const actionBtnStyle = { border: "none", background: "transparent", cursor: "pointer" };

  return (
    <div style={containerStyle}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={cardStyle}>
        {/* Modals */}
        {isModalOpen && <CreateClassModal classItem={editingClass} onClose={() => { setIsModalOpen(false); setEditingClass(null); }} onAddClass={handleAddOrUpdateClass} />}
        <DeleteModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setClassToDelete(null); }} onDelete={handleDeleteClass} itemName={classToDelete?.subject + " - " + classToDelete?.section} title="Delete Class" message={classToDelete ? `Are you sure you want to delete ${classToDelete.subject} - ${classToDelete.section}?` : ""} loading={deleting} />

        {/* Header & Controls */}
        {!isModalOpen && !isDeleteModalOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={headerStyle}>
              <div>
                <h1 style={titleStyle}>Class Management</h1>
                <p style={subtitleStyle}>Manage all classes in the system.</p>
              </div>
              <button style={buttonStyle} onClick={() => setIsModalOpen(true)}>
                <UserPlus size={16} /> Add New Class
              </button>
            </div>

            {/* Grade Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px" }}>
              {[
                { value: 'all', label: 'All Classes' },
                { value: '7', label: 'Grade 7' },
                { value: '8', label: 'Grade 8' },
                { value: '9', label: 'Grade 9' },
                { value: '10', label: 'Grade 10' },
              ].map(grade => (
                <button key={grade.value} style={filterBtnStyle(selectedGrade === grade.value)} onClick={() => setSelectedGrade(grade.value)}>
                  {grade.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={searchContainerStyle}>
              <Search size={16} color="#9ca3af" />
              <input placeholder="Search by subject, section, teacher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "14px" }} />
            </div>

            {/* Table */}
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {["Subject", "Section", "Grade Level", "Teacher", "School Year", "Schedule", "Room", "Status", "Actions"].map(header => (
                      <th key={header} style={thStyle}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "40px 0" }}>
                        <Loader2 size={24} className="animate-spin" color="#dc2626" />
                      </td>
                    </tr>
                  ) : filteredClasses.length > 0 ? (
                    filteredClasses.map(cls => (
                      <tr key={cls._id} style={{ borderBottom: "1px solid #f1f1f1" }}>
                        <td style={tdStyle}>{cls.subject}</td>
                        <td style={tdStyle}>{cls.section}</td>
                        <td style={tdStyle}>{cls.gradeLevel}</td>
                        <td style={tdStyle}>{cls.teacher}</td>
                        <td style={tdStyle}>{cls.schoolYear}</td>
                        <td style={tdStyle}>{cls.schedule}</td>
                        <td style={tdStyle}>{cls.room}</td>
                        <td style={tdStyle}><span style={statusBadgeStyle(cls.isActive)}>{cls.isActive ? "Active" : "Inactive"}</span></td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button style={actionBtnStyle} onClick={() => { setEditingClass(cls); setIsModalOpen(true); }}><Edit2 size={18} color="#111827" /></button>
                            <button style={actionBtnStyle} onClick={() => confirmDeleteClass(cls)}><Trash2 size={18} color="#111827" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}>No classes found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ClassManagementPage;
