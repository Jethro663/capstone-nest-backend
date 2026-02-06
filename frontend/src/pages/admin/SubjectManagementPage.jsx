import React, { useState, useEffect, useMemo, useCallback } from "react";
import { UserPlus, Trash2, Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CreateSubjectModal from "@/components/modals/CreateSubjectModal";
import DeleteModal from "@/components/modals/DeleteModal";
import api from "@/services/api";

const SubjectManagementPage = () => {
  // -------------------------
  // State
  // -------------------------
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------
  // Fetch Subjects
  // -------------------------
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/subjects/all");
      
      if (response.data.success) {
        // Transform backend data to match frontend expectations
        const transformedSubjects = response.data.data.map(subject => ({
          _id: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          gradeLevel: subject.gradeLevel,
          description: subject.description,
          isActive: subject.isActive,
          createdAt: subject.createdAt,
          updatedAt: subject.updatedAt,
        }));
        setSubjects(transformedSubjects);
      }
    } catch (error) {
      console.error("Failed to load subjects", error);
      toast.error("Failed to load subjects. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // -------------------------
  // Add or Update Subject
  // -------------------------
  const handleAddOrUpdateSubject = async (subjectData) => {
    try {
      if (editingSubject) {
        // Update existing subject
        const payload = {
          name: subjectData.subjectName,
          code: subjectData.subjectCode,
          gradeLevel: subjectData.gradeLevel,
          description: subjectData.description,
        };

        const response = await api.put(`/subjects/update/${editingSubject._id}`, payload);
        
        if (response.data.success) {
          toast.success("Subject updated successfully");
          await fetchSubjects(); // Refresh the list
        }
      } else {
        // Create new subject
        const payload = {
          name: subjectData.subjectName,
          code: subjectData.subjectCode,
          gradeLevel: subjectData.gradeLevel,
          description: subjectData.description,
        };

        const response = await api.post("/subjects/create", payload);
        
        if (response.data.success) {
          toast.success("Subject created successfully");
          await fetchSubjects(); // Refresh the list
        }
      }
      
      setIsModalOpen(false);
      setEditingSubject(null);
    } catch (error) {
      console.error("Failed to save subject", error);
      const errorMessage = error.response?.data?.message || "Failed to save subject";
      toast.error(errorMessage);
      throw error; // Re-throw so the modal can handle it
    }
  };

  // -------------------------
  // Delete Subject
  // -------------------------
  const confirmDeleteSubject = (subject) => {
    setSubjectToDelete(subject);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    setDeleting(true);
    try {
      const response = await api.delete(`/subjects/delete/${subjectToDelete._id}`);
      
      if (response.data.success) {
        toast.success("Subject deleted successfully");
        await fetchSubjects(); // Refresh the list
      }
    } catch (error) {
      console.error("Failed to delete subject", error);
      const errorMessage = error.response?.data?.message || "Failed to delete subject";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setSubjectToDelete(null);
    }
  };

  // -------------------------
  // Filter Subjects (Search)
  // -------------------------
  const filteredSubjects = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return subjects.filter(
      s =>
        s.subjectName.toLowerCase().includes(term) ||
        s.subjectCode.toLowerCase().includes(term) ||
        s.gradeLevel.toLowerCase().includes(term)
    );
  }, [subjects, searchTerm]);

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="flex-1 w-full rounded-2xl p-8 md:p-12">
      {/* Create/Edit Subject Modal */}
      {isModalOpen && (
        <CreateSubjectModal
          subject={editingSubject}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSubject(null);
          }}
          onAddSubject={handleAddOrUpdateSubject}
        />
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteSubject}
        itemName={subjectToDelete?.subjectName}
        loading={deleting}
        title="Delete Subject"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Subject Management</h1>
          <p className="text-slate-500">Manage all subjects in the system.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add New Subject
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-1 rounded-xl border border-gray-100 shadow-sm max-w-2xl mb-4">
        <Input
          placeholder="Search by subject name, code, or grade..."
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
              <th className="px-6 py-4">Subject Name</th>
              <th className="px-6 py-4">Subject Code</th>
              <th className="px-6 py-4">Grade Level</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="4" className="py-20 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-red-600" />
                </td>
              </tr>
            ) : filteredSubjects.length > 0 ? (
              filteredSubjects.map(subject => (
                <tr key={subject._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{subject.subjectName}</td>
                  <td className="px-6 py-4 text-slate-500">{subject.subjectCode}</td>
                  <td className="px-6 py-4 text-slate-500">{subject.gradeLevel}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setEditingSubject(subject);
                          setIsModalOpen(true);
                        }}
                        title="Edit Subject"
                      >
                        <Edit2 size={18} className="text-slate-900" />
                      </button>
                      <button
                        onClick={() => confirmDeleteSubject(subject)}
                        title="Delete Subject"
                      >
                        <Trash2 size={18} className="text-slate-900" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-12 text-center text-gray-500">
                  No subjects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubjectManagementPage;
