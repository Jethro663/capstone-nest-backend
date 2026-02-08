import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Edit2, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/services/api";
import CreateSectionModal from "@/components/modals/CreateSectionModal";
import DeleteModal from "@/components/modals/DeleteModal";

const SectionManagementPage = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------
  // Fetch Sections
  // -------------------------
  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/sections/all");
      if (response.data.success) {
        const transformedSections = response.data.data.map((section) => ({
          _id: section.id,
          sectionName: section.name,
          gradeLevel: section.gradeLevel,
          schoolYear: section.schoolYear,
          assignedTeacher: section.adviser
            ? `${section.adviser.firstName} ${section.adviser.lastName}`
            : "No Adviser",
          adviserId: section.adviser?.id,
          studentCapacity: section.capacity,
          roomNumber: section.roomNumber || "N/A",
          isActive: section.isActive,
          createdAt: section.createdAt,
          updatedAt: section.updatedAt,
        }));
        setSections(transformedSections);
      }
    } catch (error) {
      console.error("Failed to load sections", error);
      toast.error("Failed to load sections. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // -------------------------
  // Add or Update Section
  // -------------------------
  const handleAddOrUpdateSection = async (sectionData) => {
    try {
      const payload = {
        name: sectionData.sectionName,
        gradeLevel: sectionData.gradeLevel,
        schoolYear: sectionData.schoolYear,
        capacity: sectionData.studentCapacity,
        roomNumber: sectionData.roomNumber,
        adviserId: sectionData.adviserId || null,
      };

      if (editingSection) {
        const response = await api.put(`/sections/update/${editingSection._id}`, payload);
        if (response.data.success) toast.success("Section updated successfully");
        setSections(prev =>
          prev.map(s => (s._id === editingSection._id ? { ...s, ...payload } : s))
        );
      } else {
        const response = await api.post("/sections/create", payload);
        if (response.data.success) toast.success("Section created successfully");
        setSections(prev => [{ _id: crypto.randomUUID(), ...payload, isActive: true }, ...prev]);
      }

      setIsModalOpen(false);
      setEditingSection(null);
    } catch (error) {
      console.error("Failed to save section", error);
      toast.error(error.response?.data?.message || "Failed to save section");
    }
  };

  // -------------------------
  // Delete Section
  // -------------------------
  const handleDeleteSection = async () => {
    if (!sectionToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/sections/delete/${sectionToDelete._id}`);
      toast.success("Section deleted successfully");
      setSections(prev => prev.filter(s => s._id !== sectionToDelete._id));
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete section");
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setSectionToDelete(null);
    }
  };

  const confirmDeleteSection = (section) => {
    setSectionToDelete(section);
    setIsDeleteModalOpen(true);
  };

  // -------------------------
  // Filter & Search
  // -------------------------
  const filteredSections = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return sections.filter(s => {
      const matchesGrade = selectedGrade === "all" ? true : s.gradeLevel === selectedGrade;
      const matchesSearch =
        s.sectionName.toLowerCase().includes(term) ||
        s.gradeLevel.toLowerCase().includes(term) ||
        s.assignedTeacher.toLowerCase().includes(term);
      return matchesGrade && matchesSearch;
    });
  }, [sections, searchTerm, selectedGrade]);

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
        {isModalOpen && <CreateSectionModal section={editingSection} onClose={() => { setIsModalOpen(false); setEditingSection(null); }} onAddSection={handleAddOrUpdateSection} />}
        <DeleteModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setSectionToDelete(null); }} onDelete={handleDeleteSection} itemName={sectionToDelete?.sectionName} title="Delete Section" message={sectionToDelete ? `Are you sure you want to delete ${sectionToDelete.sectionName}?` : ""} loading={deleting} />

        {/* Header & Controls */}
        {!isModalOpen && !isDeleteModalOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={headerStyle}>
              <div>
                <h1 style={titleStyle}>Section Management</h1>
                <p style={subtitleStyle}>Manage all sections in the system.</p>
              </div>
              <button style={buttonStyle} onClick={() => setIsModalOpen(true)}>
                <UserPlus size={16} /> Add New Section
              </button>
            </div>

            {/* Grade Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px" }}>
              {["all", "Grade 7", "Grade 8", "Grade 9", "Grade 10"].map(grade => (
                <button key={grade} style={filterBtnStyle(selectedGrade === grade)} onClick={() => setSelectedGrade(grade)}>
                  {grade === "all" ? "All Sections" : grade}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={searchContainerStyle}>
              <Search size={16} color="#9ca3af" />
              <input placeholder="Search by section, grade, or teacher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "14px" }} />
            </div>

            {/* Table */}
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Section Name</th>
                    <th style={thStyle}>Grade Level</th>
                    <th style={thStyle}>Teacher</th>
                    <th style={thStyle}>Students</th>
                    <th style={thStyle}>Room</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "40px 0" }}>
                        <Loader2 size={24} className="animate-spin" color="#dc2626" />
                      </td>
                    </tr>
                  ) : filteredSections.length > 0 ? (
                    filteredSections.map(section => (
                      <tr key={section._id} style={{ borderBottom: "1px solid #f1f1f1", transition: "background 0.2s" }}>
                        <td style={tdStyle}>{section.sectionName}</td>
                        <td style={tdStyle}>{section.gradeLevel}</td>
                        <td style={tdStyle}>{section.assignedTeacher}</td>
                        <td style={tdStyle}>{section.studentCapacity}</td>
                        <td style={tdStyle}>{section.roomNumber}</td>
                        <td style={tdStyle}><span style={statusBadgeStyle(section.isActive)}>{section.isActive ? "Active" : "Inactive"}</span></td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button style={actionBtnStyle} onClick={() => { setEditingSection(section); setIsModalOpen(true); }}>
                              <Edit2 size={18} color="#111827" />
                            </button>
                            <button style={actionBtnStyle} onClick={() => confirmDeleteSection(section)}>
                              <Trash2 size={18} color="#111827" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}>No sections found.</td>
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

export default SectionManagementPage;
