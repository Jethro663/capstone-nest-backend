import React, { useState, useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Clock } from "lucide-react";
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
    schedule: {
      days: [],
      startTime: "",
      endTime: "",
    },
    room: "",
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
          (u) => u.roles && Array.isArray(u.roles) && u.roles.some((role) => role?.name === "teacher")
        );
        console.log("Fetched teachers:", teachersList);
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
      const scheduleData = classItem.schedule ? parseSchedule(classItem.schedule) : { days: [], startTime: "", endTime: "" };
      setFormData({
        subjectId: classItem.subjectId || "",
        sectionId: classItem.sectionId || "",
        teacherId: classItem.teacherId || "",
        schoolYear: classItem.schoolYear || "",
        schedule: scheduleData,
        room: classItem.room || "",
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

  // Parse schedule string to object
  const parseSchedule = (scheduleStr) => {
    if (!scheduleStr) return { days: [], startTime: "", endTime: "" };
    // Expecting format like "MWF 10:00 - 11:00" or "M,W,F 10:00 - 11:00"
    const match = scheduleStr.match(/([A-Z,]+)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (!match) return { days: [], startTime: "", endTime: "" };
    
    const daysStr = match[1].split(",").map(d => d.trim());
    return {
      days: daysStr,
      startTime: match[2],
      endTime: match[3],
    };
  };

  // Format schedule object to string
  const formatSchedule = (schedule) => {
    if (!schedule.days || schedule.days.length === 0 || !schedule.startTime || !schedule.endTime) {
      return null;
    }
    return `${schedule.days.join(",").toUpperCase()} ${schedule.startTime} - ${schedule.endTime}`;
  };

  // Generate years from 2026 to current year + 5
  const generateAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2026;
    const endYear = currentYear + 5;
    const years = [];
    for (let i = startYear; i <= endYear; i++) {
      years.push(`${i}-${i + 1}`);
    }
    return years;
  };

  // Days of week for schedule picker
  const daysOfWeek = ["M", "T", "W", "Th", "F", "Sa", "Su"];
  const daysOfWeekFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Toggle day selection
  const toggleDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(day)
          ? prev.schedule.days.filter((d) => d !== day)
          : [...prev.schedule.days, day],
      },
    }));
  };

  // Update schedule time
  const updateScheduleTime = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [field]: value,
      },
    }));
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
      const scheduleStr = formatSchedule(formData.schedule);
      const payload = {
        subjectId: formData.subjectId,
        sectionId: formData.sectionId,
        teacherId: formData.teacherId,
        schoolYear: formData.schoolYear,
        schedule: scheduleStr,
        room: formData.room || null,
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
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Side Panel Modal */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-8 flex items-center justify-between shadow-md">
          <div>
            <h2 className="text-2xl font-bold">
              {classItem ? "Edit Class" : "Create New Class"}
            </h2>
            <p className="text-red-100 text-sm mt-1">
              {classItem ? "Update class information" : "Add a new class to the system"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500 rounded-md transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-7">
          {/* Subject Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Subject <span className="text-red-600">*</span>
            </label>
            <select
              name="subjectId"
              value={formData.subjectId}
              onChange={handleChange}
              disabled={loadingOptions}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent disabled:bg-gray-100 transition"
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
              <p className="text-red-600 text-xs mt-1.5">{errors.subjectId}</p>
            )}
          </div>

          {/* Section Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Section <span className="text-red-600">*</span>
            </label>
            <select
              name="sectionId"
              value={formData.sectionId}
              onChange={handleChange}
              disabled={loadingOptions}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent disabled:bg-gray-100 transition"
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
              <p className="text-red-600 text-xs mt-1.5">{errors.sectionId}</p>
            )}
          </div>

          {/* Teacher Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Teacher <span className="text-red-600">*</span>
            </label>
            <select
              name="teacherId"
              value={formData.teacherId}
              onChange={handleChange}
              disabled={loadingOptions}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent disabled:bg-gray-100 transition"
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
              <p className="text-red-600 text-xs mt-1.5">{errors.teacherId}</p>
            )}
          </div>

          {/* School Year Picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              School Year <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <select
                name="schoolYear"
                value={formData.schoolYear}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition appearance-none"
              >
                <option value="">Select a school year</option>
                {generateAvailableYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
            {errors.schoolYear && (
              <p className="text-red-600 text-xs mt-1.5">{errors.schoolYear}</p>
            )}
          </div>

          {/* Schedule Picker */}
          <div className="bg-gray-50 rounded-md p-6 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="inline mr-2" size={16} />
              Schedule (Optional)
            </label>

            {/* Days Selection */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Select Days</p>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-md font-medium text-sm transition ${
                      formData.schedule.days.includes(day)
                        ? "bg-red-600 text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:border-red-400"
                    }`}
                    title={daysOfWeekFull[idx]}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={formData.schedule.startTime}
                  onChange={(e) => updateScheduleTime("startTime", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={formData.schedule.endTime}
                  onChange={(e) => updateScheduleTime("endTime", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Schedule Preview */}
            {formData.schedule.days.length > 0 && formData.schedule.startTime && formData.schedule.endTime && (
              <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-600 rounded">
                <p className="text-sm text-red-900">
                  <span className="font-semibold">Schedule:</span> {formData.schedule.days.join(", ")} {formData.schedule.startTime} - {formData.schedule.endTime}
                </p>
              </div>
            )}
          </div>

          {/* Room Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Room (Optional)
            </label>
            <input
              type="text"
              name="room"
              value={formData.room}
              onChange={handleChange}
              placeholder="e.g., Room 101 or A-205"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Saving..." : "Save Class"}
            </button>
          </div>
        </form>
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
