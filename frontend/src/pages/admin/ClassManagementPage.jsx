import React, { useState, useEffect, useMemo, useCallback } from "react";
import { UserPlus, Trash2, Edit2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CreateClassModal from "@/components/modals/CreateClassModal";
import DeleteModal from "@/components/modals/DeleteModal";
import api from "@/services/api";

const ClassManagementPage = () => {
  // -------------------------
  // State
  // -------------------------
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
        // Transform backend data to match frontend expectations
        const transformedClasses = response.data.data.map((classItem) => ({
          _id: classItem.id,
          id: classItem.id,
          subjectId: classItem.subjectId,
          sectionId: classItem.sectionId,
          teacherId: classItem.teacherId,
          schoolYear: classItem.schoolYear,
          schedule: classItem.schedule,
          room: classItem.room,
          isActive: classItem.isActive,
          subject: classItem.subject,
          section: classItem.section,
          teacher: classItem.teacher,
          createdAt: classItem.createdAt,
          updatedAt: classItem.updatedAt,
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
        // Update existing class
        const response = await api.put(`/classes/${editingClass._id}`, classData);

        if (response.data.success) {
          toast.success("Class updated successfully");
          await fetchClasses(); // Refresh the list
        }
      } else {
        // Create new class
        const response = await api.post("/classes", classData);

        if (response.data.success) {
          toast.success("Class created successfully");
          await fetchClasses(); // Refresh the list
        }
      }

      setIsModalOpen(false);
      setEditingClass(null);
    } catch (error) {
      console.error("Failed to save class", error);
      const errorMessage = error.response?.data?.message || "Failed to save class";
      toast.error(errorMessage);
      throw error; // Re-throw so the modal can handle it
    }
  };

  // -------------------------
  // Delete Class
  // -------------------------
  const confirmDeleteClass = (classItem) => {
    setClassToDelete(classItem);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    setDeleting(true);
    try {
      const response = await api.delete(`/classes/${classToDelete._id}`);

      if (response.data.success) {
        toast.success("Class deleted successfully");
        await fetchClasses(); // Refresh the list
      }
    } catch (error) {
      console.error("Failed to delete class", error);
      const errorMessage = error.response?.data?.message || "Failed to delete class";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setClassToDelete(null);
    }
  };

  // -------------------------
  // Filter Classes (Search)
  // -------------------------
  const filteredClasses = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return classes.filter(
      (c) =>
        (c.subject?.name || "").toLowerCase().includes(term) ||
        (c.section?.name || "").toLowerCase().includes(term) ||
        (c.teacher?.firstName || "").toLowerCase().includes(term) ||
        (c.teacher?.lastName || "").toLowerCase().includes(term) ||
        (c.schedule || "").toLowerCase().includes(term) ||
        (c.room || "").toLowerCase().includes(term)
    );
  }, [classes, searchTerm]);

  // -------------------------
  // Get display names
  // -------------------------
  const getTeacherName = (teacher) => {
    if (!teacher) return "Unknown";
    return `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim();
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="flex-1 w-full rounded-2xl p-8 md:p-12">
      {/* Create/Edit Class Modal */}
      {isModalOpen && (
        <CreateClassModal
          classItem={editingClass}
          onClose={() => {
            setIsModalOpen(false);
            setEditingClass(null);
          }}
          onAddClass={handleAddOrUpdateClass}
        />
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteClass}
        itemName={classToDelete ? `${classToDelete.subject?.name} - ${classToDelete.section?.name}` : ""}
        loading={deleting}
        title="Delete Class"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Class Management</h1>
          <p className="text-slate-500">Manage all classes in the system.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add New Class
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-1 rounded-xl border border-gray-100 shadow-sm max-w-2xl mb-4">
        <Search className="h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search by subject, section, teacher, schedule, or room..."
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
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Section</th>
              <th className="px-6 py-4">Teacher</th>
              <th className="px-6 py-4">School Year</th>
              <th className="px-6 py-4">Schedule</th>
              <th className="px-6 py-4">Room</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="8" className="py-20 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                </td>
              </tr>
            ) : filteredClasses.length > 0 ? (
              filteredClasses.map((classItem) => (
                <tr key={classItem._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {classItem.subject?.name || "Unknown"}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {classItem.section?.name || "Unknown"}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {getTeacherName(classItem.teacher)}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{classItem.schoolYear}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {classItem.schedule || "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {classItem.room || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        classItem.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {classItem.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setEditingClass(classItem);
                          setIsModalOpen(true);
                        }}
                        title="Edit Class"
                      >
                        <Edit2 size={18} className="text-slate-900" />
                      </button>
                      <button
                        onClick={() => confirmDeleteClass(classItem)}
                        title="Delete Class"
                      >
                        <Trash2 size={18} className="text-slate-900" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="py-12 text-center text-gray-500">
                  No classes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClassManagementPage;
