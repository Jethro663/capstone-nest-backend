import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Edit2, Search, Loader2 } from "lucide-react";
import api from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      console.log("Fetched classes:", response.data);
      if (response.data.success) {
        const transformedClasses = response.data.data.map((c) => ({
          _id: c.id,
          subject: c.subject,
          section: c.section,
          teacher: c.teacher,
          schoolYear: c.schoolYear,
          schedule: c.schedule,
          room: c.room,
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
      const errorMessage = error.response?.data?.message || "Failed to save class";
      toast.error(errorMessage);
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
      if (response.data.success) toast.success("Class deleted successfully");
      await fetchClasses();
    } catch (error) {
      console.error("Failed to delete class", error);
      toast.error(error.response?.data?.message || "Failed to delete class");
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setClassToDelete(null);
    }
  };

  // -------------------------
  // Search Filter
  // -------------------------
  const filteredClasses = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return classes.filter(
      (c) => {
        // Filter by grade level
        const gradeLevel = c.section?.gradeLevel || c.subject?.gradeLevel || "";
        const matchesGrade = selectedGrade === "all" ? true : gradeLevel === selectedGrade;

        // Filter by search term
        const matchesSearch =
          (c.subject?.name || "").toLowerCase().includes(term) ||
          (c.section?.name || "").toLowerCase().includes(term) ||
          (c.teacher?.firstName || "").toLowerCase().includes(term) ||
          (c.teacher?.lastName || "").toLowerCase().includes(term) ||
          (c.schedule || "").toLowerCase().includes(term) ||
          (c.room || "").toLowerCase().includes(term) ||
          gradeLevel.toLowerCase().includes(term);

        return matchesGrade && matchesSearch;
      }
    );
  }, [classes, searchTerm, selectedGrade]);

  const getTeacherName = (teacher) => {
    if (!teacher) return "Unknown";
    return `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim();
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="flex-1 w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12">
      {/* Modals */}
      {isModalOpen && (
        <div className="animate-in fade-in slide-in-from-right-5 duration-300">
          <CreateClassModal
            classItem={editingClass}
            onClose={() => {
              setIsModalOpen(false);
              setEditingClass(null);
            }}
            onAddClass={handleAddOrUpdateClass}
          />
        </div>
      )}

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteClass}
        itemName={classToDelete ? `${classToDelete.subject?.name} - ${classToDelete.section?.name}` : ""}
        loading={deleting}
        title="Delete Class"
      />

      {!isModalOpen && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Class Management</h1>
              <p className="text-slate-500">Manage all classes in the system.</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Add New Class
            </Button>
          </div>

          {/* Grade Filter Buttons */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-100">
            <button
              onClick={() => setSelectedGrade("all")}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                selectedGrade === "all"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-gray-50 text-slate-600 hover:bg-gray-100"
              }`}
            >
              All Classes
            </button>
            <button
              onClick={() => setSelectedGrade("Grade 7")}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                selectedGrade === "Grade 7"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-gray-50 text-slate-600 hover:bg-gray-100"
              }`}
            >
              Grade 7
            </button>
            <button
              onClick={() => setSelectedGrade("Grade 8")}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                selectedGrade === "Grade 8"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-gray-50 text-slate-600 hover:bg-gray-100"
              }`}
            >
              Grade 8
            </button>
            <button
              onClick={() => setSelectedGrade("Grade 9")}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                selectedGrade === "Grade 9"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-gray-50 text-slate-600 hover:bg-gray-100"
              }`}
            >
              Grade 9
            </button>
            <button
              onClick={() => setSelectedGrade("Grade 10")}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                selectedGrade === "Grade 10"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-gray-50 text-slate-600 hover:bg-gray-100"
              }`}
            >
              Grade 10
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-1 rounded-xl border border-gray-100 shadow-sm max-w-2xl">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by subject, section, teacher, schedule, or room..."
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
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Section</th>
                  <th className="px-6 py-4">Grade Level</th>
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
                    <td colSpan="9" className="py-20 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : filteredClasses.length > 0 ? (
                  filteredClasses.map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{c.subject?.name || "Unknown"}</td>
                      <td className="px-6 py-4 text-slate-500">{c.section?.name || "Unknown"}</td>
                      <td className="px-6 py-4 text-slate-500">{c.section?.gradeLevel || c.subject?.gradeLevel || "—"}</td>
                      <td className="px-6 py-4 text-slate-500">{getTeacherName(c.teacher)}</td>
                      <td className="px-6 py-4 text-slate-500">{c.schoolYear}</td>
                      <td className="px-6 py-4 text-slate-500">{c.schedule || "—"}</td>
                      <td className="px-6 py-4 text-slate-500">{c.room || "—"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${
                            c.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                          }`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => {
                              setEditingClass(c);
                              setIsModalOpen(true);
                            }}
                            title="Edit Class"
                          >
                            <Edit2 size={18} className="text-slate-900" />
                          </button>
                          <button onClick={() => confirmDeleteClass(c)} title="Delete Class">
                            <Trash2 size={18} className="text-slate-900" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-gray-500">
                      No classes found.
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

export default ClassManagementPage;
