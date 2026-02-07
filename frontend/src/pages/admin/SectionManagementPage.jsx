import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Edit2, Search, Loader2 } from "lucide-react";
import api from "@/services/api";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CreateSectionModal from "@/components/modals/CreateSectionModal";
import DeleteModal from "@/components/modals/DeleteModal";

const SectionManagementPage = () => {
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
      if (editingSection) {
        const payload = {
          name: sectionData.sectionName,
          gradeLevel: sectionData.gradeLevel,
          schoolYear: sectionData.schoolYear,
          capacity: sectionData.studentCapacity,
          roomNumber: sectionData.roomNumber,
          adviserId: sectionData.adviserId || null,
        };
        const response = await api.put(`/sections/update/${editingSection._id}`, payload);
        if (response.data.success) toast.success("Section updated successfully");
      } else {
        const payload = {
          name: sectionData.sectionName,
          gradeLevel: sectionData.gradeLevel,
          schoolYear: sectionData.schoolYear,
          capacity: sectionData.studentCapacity,
          roomNumber: sectionData.roomNumber,
          adviserId: sectionData.adviserId || null,
        };
        const response = await api.post("/sections/create", payload);
        if (response.data.success) toast.success("Section created successfully");
      }
      await fetchSections();
      setIsModalOpen(false);
      setEditingSection(null);
    } catch (error) {
      console.error("Failed to save section", error);
      toast.error(error.response?.data?.message || "Failed to save section");
      throw error;
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
      const response = await api.delete(`/sections/delete/${sectionToDelete._id}`);
      if (response.data.success) toast.success("Section deleted successfully");
      await fetchSections();
    } catch (error) {
      console.error("Failed to delete section", error);
      toast.error(error.response?.data?.message || "Failed to delete section");
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setSectionToDelete(null);
    }
  };

  // -------------------------
  // Filter Sections
  // -------------------------
  const filteredSections = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return sections.filter(
      (s) =>
        s.sectionName.toLowerCase().includes(term) ||
        s.gradeLevel.toLowerCase().includes(term) ||
        s.assignedTeacher.toLowerCase().includes(term)
    );
  }, [sections, searchTerm]);

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="flex-1 w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12">
      {/* Modals */}
      {isModalOpen && (
        <div className="animate-in fade-in slide-in-from-right-5 duration-300">
          <CreateSectionModal
            section={editingSection}
            onClose={() => {
              setIsModalOpen(false);
              setEditingSection(null);
            }}
            onAddSection={handleAddOrUpdateSection}
          />
        </div>
      )}

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteSection}
        itemName={sectionToDelete?.sectionName}
        loading={deleting}
        title="Delete Section"
      />

      {!isModalOpen && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Section Management</h1>
              <p className="text-slate-500">Manage all sections in the system.</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add New Section
            </Button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-1 rounded-xl border border-gray-100 shadow-sm max-w-2xl">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by section, grade, or teacher..."
              className="border-0 bg-transparent focus-visible:ring-0 shadow-none text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Section Name</th>
                  <th className="px-6 py-4">Grade Level</th>
                  <th className="px-6 py-4">Teacher</th>
                  <th className="px-6 py-4">Students</th>
                  <th className="px-6 py-4">Room</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-20 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : filteredSections.length > 0 ? (
                  filteredSections.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{s.sectionName}</td>
                      <td className="px-6 py-4 text-slate-500">{s.gradeLevel}</td>
                      <td className="px-6 py-4 text-slate-500">{s.assignedTeacher}</td>
                      <td className="px-6 py-4 text-slate-500">{s.studentCapacity}</td>
                      <td className="px-6 py-4 text-slate-500">{s.roomNumber}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${
                            s.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                          }`}
                        >
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => {
                              setEditingSection(s);
                              setIsModalOpen(true);
                            }}
                            title="Edit Section"
                          >
                            <Edit2 size={18} className="text-slate-900" />
                          </button>
                          <button onClick={() => confirmDeleteSection(s)} title="Delete Section">
                            <Trash2 size={18} className="text-slate-900" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-500">
                      No sections found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionManagementPage;
