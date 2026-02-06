import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ApiErrorModal from "@/components/modals/ApiErrorModal";
import api from "@/services/api";

const CreateClassModal = ({ classItem, onClose, onAddClass }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // API ERROR STATE
  const [apiError, setApiError] = useState(null);
  const [showApiError, setShowApiError] = useState(false);

  // Available options for dropdowns
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [formData, setFormData] = useState({
    subjectId: "",
    sectionId: "",
    teacherId: "",
    schoolYear: "",
    schedule: "",
    room: "",
    isActive: true,
  });

  // Fetch available options when modal opens
  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [subjectsRes, sectionsRes, usersRes] = await Promise.all([
        api.get("/subjects/all"),
        api.get("/sections/all"),
        api.get("/users/all"),
      ]);

      if (subjectsRes.data.success && Array.isArray(subjectsRes.data.data)) {
        setSubjects(subjectsRes.data.data);
      }

      if (sectionsRes.data.success && Array.isArray(sectionsRes.data.data)) {
        setSections(sectionsRes.data.data);
      }

      if (usersRes.data.success && Array.isArray(usersRes.data.users)) {
        // Filter for teachers only
        const teachersList = usersRes.data.users.filter(
          (u) => u.role === "teacher"
        );
        setTeachers(teachersList);
      }
    } catch (error) {
      console.error("Failed to fetch options", error);
      toast.error("Failed to load form options");
    } finally {
      setLoadingOptions(false);
    }
  };

  // Populate form when editing
  useEffect(() => {
    if (classItem) {
      setFormData({
        subjectId: classItem.subjectId || "",
        sectionId: classItem.sectionId || "",
        teacherId: classItem.teacherId || "",
        schoolYear: classItem.schoolYear || "",
        schedule: classItem.schedule || "",
        room: classItem.room || "",
        isActive: classItem.isActive !== false,
      });
    }
  }, [classItem]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));

    if (fieldValue) {
      setErrors((errs) => ({
        ...errs,
        [name]: "",
      }));
    }
  };

  // Validate form
  const isFormValid = useMemo(() => {
    return (
      formData.subjectId &&
      formData.sectionId &&
      formData.teacherId &&
      formData.schoolYear &&
      !Object.values(errors).some(Boolean)
    );
  }, [formData, errors]);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const newErrors = {};
    if (!formData.subjectId) newErrors.subjectId = "Subject is required";
    if (!formData.sectionId) newErrors.sectionId = "Section is required";
    if (!formData.teacherId) newErrors.teacherId = "Teacher is required";
    if (!formData.schoolYear) newErrors.schoolYear = "School year is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        subjectId: formData.subjectId,
        sectionId: formData.sectionId,
        teacherId: formData.teacherId,
        schoolYear: formData.schoolYear,
        schedule: formData.schedule || null,
        room: formData.room || null,
        isActive: formData.isActive,
      };

      await onAddClass(payload);
      onClose();
    } catch (error) {
      console.error("Failed to save class", error);
      const errorMessage = error.response?.data?.message || "Failed to save class";
      setApiError(errorMessage);
      setShowApiError(true);
    } finally {
      setLoading(false);
    }
  };

  // Get subject name by ID
  const getSubjectName = (id) => {
    const subject = subjects.find((s) => s.id === id);
    return subject?.name || "Unknown Subject";
  };

  // Get section name by ID
  const getSectionName = (id) => {
    const section = sections.find((s) => s.id === id);
    return section?.name || "Unknown Section";
  };

  // Get teacher name by ID
  const getTeacherName = (id) => {
    const teacher = teachers.find(
      (t) => t.id === id || t._id === id
    );
    if (teacher) {
      return `${teacher.firstName || teacher.fullName || ""} ${teacher.lastName || ""}`.trim();
    }
    return "Unknown Teacher";
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-slate-900">
              {classItem ? "Edit Class" : "Create New Class"}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Subject *
              </label>
              <select
                name="subjectId"
                value={formData.subjectId}
                onChange={handleChange}
                disabled={loadingOptions}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingOptions ? "Loading..." : "Select a subject"}
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
              {errors.subjectId && (
                <p className="text-red-500 text-sm mt-1">{errors.subjectId}</p>
              )}
            </div>

            {/* Section */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Section *
              </label>
              <select
                name="sectionId"
                value={formData.sectionId}
                onChange={handleChange}
                disabled={loadingOptions}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingOptions ? "Loading..." : "Select a section"}
                </option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name} - {section.gradeLevel}
                  </option>
                ))}
              </select>
              {errors.sectionId && (
                <p className="text-red-500 text-sm mt-1">{errors.sectionId}</p>
              )}
            </div>

            {/* Teacher */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Teacher *
              </label>
              <select
                name="teacherId"
                value={formData.teacherId}
                onChange={handleChange}
                disabled={loadingOptions}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingOptions ? "Loading..." : "Select a teacher"}
                </option>
                {teachers.map((teacher) => (
                  <option key={teacher.id || teacher._id} value={teacher.id || teacher._id}>
                    {teacher.firstName || teacher.fullName} {teacher.lastName || ""}
                  </option>
                ))}
              </select>
              {errors.teacherId && (
                <p className="text-red-500 text-sm mt-1">{errors.teacherId}</p>
              )}
            </div>

            {/* School Year */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                School Year *
              </label>
              <input
                type="text"
                name="schoolYear"
                value={formData.schoolYear}
                onChange={handleChange}
                placeholder="e.g., 2024-2025"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.schoolYear && (
                <p className="text-red-500 text-sm mt-1">{errors.schoolYear}</p>
              )}
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Schedule (Optional)
              </label>
              <input
                type="text"
                name="schedule"
                value={formData.schedule}
                onChange={handleChange}
                placeholder="e.g., MWF 10:00 AM - 11:00 AM"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Room */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Room (Optional)
              </label>
              <input
                type="text"
                name="room"
                value={formData.room}
                onChange={handleChange}
                placeholder="e.g., Room 101"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-sm font-semibold text-slate-700">
                Active Class
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-slate-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Saving..." : "Save Class"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* API Error Modal */}
      <ApiErrorModal
        isOpen={showApiError}
        onClose={() => setShowApiError(false)}
        error={apiError}
      />
    </>
  );
};

export default CreateClassModal;
