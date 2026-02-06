import React, { useState, useEffect, useMemo, useCallback } from "react";
import { UserPlus, Trash2, Edit2, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CreateSectionModal from "@/components/modals/CreateSectionModal";
import DeleteModal from "@/components/modals/DeleteModal";

const SectionManagementPage = () => {
  // -------------------------
  // State
  // -------------------------
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
      // Replace with API call
      // const response = await api.get("/sections");
      // setSections(response.data);

      // Mock data for now
      const mockData = [
        {
          _id: "1",
          sectionName: "Section A",
          gradeLevel: "Grade 10",
          assignedTeacher: "Mr. John Smith",
          studentCapacity: 30,
          roomNumber: "Room 101",
          schedule: "Mon-Fri, 8:00-10:00",
        },
        {
          _id: "2",
          sectionName: "Section B",
          gradeLevel: "Grade 11",
          assignedTeacher: "Ms. Jane Doe",
          studentCapacity: 25,
          roomNumber: "Room 102",
          schedule: "Mon-Fri, 10:00-12:00",
        },
      ];

      setSections(mockData);
    } catch (error) {
      console.error("Failed to load sections", error);
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
      if (editingSection) {
        // Replace with API PUT request
        setSections(prev =>
          prev.map(s => (s._id === editingSection._id ? { ...s, ...sectionData } : s))
        );
      } else {
        // Replace with API POST request
        setSections(prev => [{ _id: crypto.randomUUID(), ...sectionData }, ...prev]);
      }
      setIsModalOpen(false);
      setEditingSection(null);
    } catch (error) {
      console.error("Failed to save section", error);
    }
  };

  // -------------------------
  // Delete Section
  // -------------------------
  const confirmDeleteSection = (section) => {
    setSectionToDelete(section);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSection = async () => {
    if (!sectionToDelete) return;
    setDeleting(true);
    try {
      // Replace with API DELETE request
      setSections(prev => prev.filter(s => s._id !== sectionToDelete._id));
    } catch (error) {
      console.error("Failed to delete section", error);
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setSectionToDelete(null);
    }
  };

  // -------------------------
  // Filter Sections (Search)
  // -------------------------
  const filteredSections = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return sections.filter(
      s =>
        s.sectionName.toLowerCase().includes(term) ||
        s.gradeLevel.toLowerCase().includes(term) ||
        s.assignedTeacher.toLowerCase().includes(term)
    );
  }, [sections, searchTerm]);

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="flex-1 w-full rounded-2xl p-8 md:p-12">
      {/* Create Section Modal */}
      {isModalOpen && (
        <CreateSectionModal
          section={editingSection}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSection(null);
          }}
          onAddSection={handleAddOrUpdateSection}
        />
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteSection}
        itemName={sectionToDelete?.sectionName}
        loading={deleting}
        title="Delete Section"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Section Management</h1>
          <p className="text-slate-500">Manage all sections in the system.</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add New Section
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-1 rounded-xl border border-gray-100 shadow-sm max-w-2xl mb-4">
        <Input
          placeholder="Search by section, grade, or teacher..."
          className="border-0 bg-transparent focus-visible:ring-0 shadow-none text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Section Name</th>
              <th className="px-6 py-4">Grade Level</th>
              <th className="px-6 py-4">Teacher</th>
              <th className="px-6 py-4">Students</th>
              <th className="px-6 py-4">Room</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-20 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-red-600" />
                </td>
              </tr>
            ) : filteredSections.length > 0 ? (
              filteredSections.map(section => (
                <tr key={section._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{section.sectionName}</td>
                  <td className="px-6 py-4 text-slate-500">{section.gradeLevel}</td>
                  <td className="px-6 py-4 text-slate-500">{section.assignedTeacher}</td>
                  <td className="px-6 py-4 text-slate-500">{section.studentCapacity}</td>
                  <td className="px-6 py-4 text-slate-500">{section.roomNumber}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setEditingSection(section);
                          setIsModalOpen(true);
                        }}
                        title="Edit Section"
                      >
                        <Edit2 size={18} className="text-slate-900" />
                      </button>
                      <button
                        onClick={() => confirmDeleteSection(section)}
                        title="Delete Section"
                      >
                        <Trash2 size={18} className="text-slate-900" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-12 text-center text-gray-500">
                  No sections found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SectionManagementPage;
